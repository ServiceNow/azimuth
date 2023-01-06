# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import abc
import os
import threading
import time
from functools import partial
from os.path import join as pjoin
from typing import Any, Callable, Dict, Generic, List, Optional, Tuple, TypeVar, cast

import structlog
from datasets import Dataset
from distributed import Client, Event, Future, rejoin, secede

from azimuth.config import CommonFieldsConfig
from azimuth.modules.base_classes.caching import HDF5CacheMixin
from azimuth.types import DatasetSplitName, ModuleResponse
from azimuth.utils.logs import TimerLogging

log = structlog.get_logger()

ConfigScope = TypeVar("ConfigScope", bound=CommonFieldsConfig)


class DaskModule(HDF5CacheMixin, Generic[ConfigScope]):
    """Abstract class that define an item of work to be computed on the cluster.

    Notes:
        For now, we expect one result per index stored as a record.

    Args:
        dataset_split_name: Which dataset_split to run the Module on.
        config: Configuration of the application
    """

    allowed_splits = {DatasetSplitName.train, DatasetSplitName.eval}

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: ConfigScope,
    ):
        if dataset_split_name not in self.allowed_splits:
            raise ValueError(
                f"{dataset_split_name} not allowed for this Module: {self.allowed_splits}"
            )

        self.dataset_split_name = dataset_split_name
        self.config = self._get_config_scope(config)

        self._name = self._get_name()
        self._callbacks: List[ModuleCallback] = []
        # A Future is the async task that is run on the Dask cluster.
        # It is a "promise" that it will hold a value sometime in the future.
        self.future: Optional[Future] = None
        self.done_event: Optional[Event] = None
        # We cache the result in a HDF5 file and we have a FileLock.
        self.cache_dir = pjoin(self.config.get_artifact_path(), self.__class__.__name__)
        os.makedirs(self.cache_dir, exist_ok=True)
        self._cache_file = pjoin(self.cache_dir, f"{self.name}.h5")
        self._cache_lock = pjoin(self.cache_dir, f"{self.name}.h5.lock")
        self._cache_effective_arguments = pjoin(self.cache_dir, f"{self.name}.json")
        self._status = "not_started"

    @property
    def name(self):
        return self._name

    @abc.abstractmethod
    def _get_name(self) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def get_caching_indices(self) -> List[int]:
        raise NotImplementedError

    @property
    def task_id(self) -> Tuple[str, int]:
        indices_hash = hash(tuple(self.get_caching_indices()))
        return self.name, indices_hash

    def _get_config_scope(self, config) -> ConfigScope:
        """Get the current config scope from full/partial config."""

        # TODO: This is hacky, should be a better to do get the config scope.
        base = self.__orig_bases__[0]  # type: ignore
        if not hasattr(base, "__args__") or isinstance(base.__args__[0], TypeVar):
            log.warning("Can't get internal type. Applying soft-cast only!")
            scoped_config = config.__class__
        else:
            scoped_config = base.__args__[0]
        return cast(ConfigScope, scoped_config.parse_obj(config.dict(by_alias=True)))

    def start_task_on_dataset_split(
        self, client: Client, dependencies: List["DaskModule"] = None
    ) -> "DaskModule":
        """Will schedule the task on the Cluster with a `Client`.

        Args:
            client: A Dask client.
            dependencies: Optional list of Modules to wait for.

        Returns:
            self.

        """
        log.info(f"Starting {self.name}")
        deps = [d.done_event for d in dependencies] if dependencies is not None else []
        if not all(deps):
            raise ValueError("Can't wait for an unstarted Module.")
        self.done_event = Event(name="-".join(map(str, self.task_id)), client=client)
        # pure=false to be sure that everything is rerun.
        self.future = client.submit(
            self._compute_on_dataset_split_with_deps,
            pure=False,
            dependencies=deps,
        )
        # Tell that this future is used on which indices.
        self.future.indices = self.get_caching_indices()
        self.future.is_custom = False
        # Create an event for its completion for logging.
        self.add_done_callback(self.on_end)
        # Register an event that will await all callbacks
        th = threading.Thread(target=self._wait_for_completion)
        th.setDaemon(True)
        th.start()
        return self

    def start_task(self, client: Client, custom_query: Dict[str, Any]) -> "DaskModule":
        """
        Will schedule the task on the Cluster with a `Client`.

        Args:
            client: A Dask client.
            custom_query: Custom query to process.

        Returns:
            self
        """
        log.info(f"Starting custom query {self.name}")
        # pure=false to be sure that everything is rerun.
        # Using self.name as key as we don't have indices
        self.future = client.submit(
            self.compute, custom_query, key=f"{self.name}_{hash(str(custom_query))}", pure=False
        )
        # Tell that this future is for custom use only.
        self.future.is_custom = True
        self.add_done_callback(self.on_end)
        return self

    def _compute_on_dataset_split_with_deps(self, dependencies: Optional[List[Event]] = None):
        """Will wait for dependencies to be completed before computing.

        Args:
            dependencies: Set of Module.done_event to wait for.

        Returns:
            Result of `self.compute_on_dataset_split`.

        """
        if dependencies is not None:
            secede()
            for event in dependencies:
                try:
                    event.wait()
                except AttributeError:
                    log.error(
                        "Error while waiting on dependencies,"
                        " will launch the task now and hope for the best.",
                        event_name=event.name,
                        module=self.name,
                    )
            rejoin()
        with TimerLogging(self.name):
            return self.compute_on_dataset_split()

    @abc.abstractmethod
    def compute_on_dataset_split(self) -> List[ModuleResponse]:
        raise NotImplementedError

    @abc.abstractmethod
    def compute(self, batch: Dataset) -> List[ModuleResponse]:
        """Method that computes the actual task result.

        Args:
            batch: input to be processed.

        """
        raise NotImplementedError

    def add_done_callback(self, fn: Callable, **kwargs):
        self._callbacks.append(ModuleCallback.create_callback(fn, module=self, **kwargs))

    def on_end(self, fut, module):
        """Callback that handles errors.

        Args:
            fut: The dask scheduled task.
            module: Not used, current module.
        """
        self._status = fut.status
        if fut.status == "error":
            e = fut.exception()
            log.exception(f"Exception in {self.name}", exc_info=e)
        elif fut.status == "lost":
            log.warning(f"Future is lost in {self.name}! Retrying")
            fut.retry()
        elif fut.status == "finished" and not self.future.is_custom:
            # Store the result in cache
            self._store_data_in_cache(fut.result(), fut.indices)
            log.info(f"{self.name} completed and stored in cache", status=fut.status)

    def _wait_for_completion(self):
        """Internal function that loop till completion and then set `self.done_event`."""
        while not self.done(allow_cache=False):
            time.sleep(1)
        if self.done_event is not None:
            self.done_event.set()

    def wait(self):
        """Client function that wait on the event till completion."""
        if self.done_event is not None:
            self.done_event.wait()

    def status(self):
        """Return the status of the future.

        Returns:
            One of {'not_started', 'pending', 'lost', 'error', 'done'}.
            If the task was not launched, `not_started` will be returned by default.
        """
        if self.future:
            return self.future.status
        return self._status

    def done(self, allow_cache: bool = True):
        """Check if this task and its callbacks are completed.

        Args:
            allow_cache: If true, allow to go look on disk versus
             only looking at the `future` and callbacks status.

        Notes:
            When allow_cache=True, it require to load the datasets.
            Do not do this in the main thread.

        Returns:
            If this module is completed.
        """
        in_cache = self._check_cache(self.get_caching_indices()) if allow_cache else False

        future_done = self.future is not None and self.future.done()
        cbk_dones = all(c.done for c in self._callbacks)

        return (in_cache or future_done) and cbk_dones

    def result(self) -> List[ModuleResponse]:
        """Get the result of the future and save it to cache.

        Returns:
            result: The dask task response.

        Raises:
            If the Dask Future is empty.
        """
        result: List[ModuleResponse]
        in_cache = self._check_cache(self.get_caching_indices())
        if self.future is not None:
            # Result not in cache, need to get them.
            if self.status() == "lost":
                log.warning("Future is lost! Retrying")
                self.future.retry()

            # Wait for the result
            result = self.future.result()

            return result
        elif in_cache:
            # Fetch the result in cache.
            result = self._get_cache(self.get_caching_indices())
        else:
            raise ValueError("Cant get result from an unlaunched tasks!")
        return result


class ModuleCallback:
    """Add callbacks to modules.

    Args:
        fn: callback.

    """

    def __init__(self, fn: Callable):
        self.fn = fn
        self.done = False
        self.result = None

    @classmethod
    def create_callback(cls, fn, module, **kwargs) -> "ModuleCallback":
        if module.future is None:
            raise ValueError("Module has no Future")
        cbk = cls(fn)
        module.future.add_done_callback(partial(cbk._run, module=module, **kwargs))
        return cbk

    def _run(self, fut, module, **kwargs):
        try:
            self.result = self.fn(fut, module, **kwargs)
        finally:
            self.done = True
