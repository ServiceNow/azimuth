# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import Any, Callable, Dict, List, Optional, Tuple

import structlog
from distributed import Client, SpecCluster

from azimuth.config import AzimuthConfig
from azimuth.modules.base_classes import DaskModule, ExpirableMixin
from azimuth.modules.task_mapping import model_contract_methods, modules
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod, SupportedTask
from azimuth.utils.cluster import default_cluster

log = structlog.get_logger()


class TaskManagerLockedException(Exception):
    pass


class TaskManager:
    """The Task Manager responsibility is to start tasks and scale the Cluster as needed.

    Args:
        config: The application configuration.
        cluster: Dask cluster to use, we will spawn a default one if not provided.

    """

    def __init__(self, config: AzimuthConfig, cluster: Optional[SpecCluster] = None):
        self.config = config
        self.cluster = cluster or default_cluster(large=config.large_dask_cluster)
        self.client = Client(cluster)
        self.tasks: Dict[str, type] = {}
        self.current_tasks: Dict[str, DaskModule] = {}
        self._is_locked = False
        self._register_all_tasks({"methods": model_contract_methods, "modules": modules})

    def lock(self):
        if self._is_locked:
            raise ValueError("TaskManager already locked!")
        self._is_locked = True

    def unlock(self):
        if not self._is_locked:
            raise ValueError("TaskManager was not locked!")
        self._is_locked = False

    @property
    def is_locked(self):
        return self._is_locked

    def close(self):
        """
        Close down the task manager and Client.
        """
        for mod in self.current_tasks.values():
            if mod.future is not None:
                try:
                    mod.future.cancel()
                except Exception:
                    pass
        self.client.close()

    def register_task(self, name, cls):
        # Add the task `cls` to the list of available tasks.
        self.tasks[name] = cls

    def _register_all_tasks(self, root_routes: Dict[str, Any]):
        """Register all tasks from azimuth.modules so that they can be used."""
        for route, tasks in root_routes.items():
            for name, task in tasks.items():
                page_name = f"{route}/{name}"
                log.debug(f"Registering new task in {route}.", name=page_name, clss=task)
                self.register_task(name, task)

    def get_all_tasks_status(self, task: Optional[str] = None) -> Dict[str, str]:
        """Get all the tasks related to `task` argument.

        Args:
            task: Returns all tasks named as such. If None, return all tasks.

        Returns:
            Dict[name, status] for all matching tasks.

        """
        if task is not None:
            # Get specific tasks
            return {str(k): v.status() for k, v in self.current_tasks.items() if task in k}
        else:
            # Get all tasks
            return {str(k): v.status() for k, v in self.current_tasks.items()}

    def get_task(
        self,
        task_name: SupportedTask,
        dataset_split_name: DatasetSplitName,
        mod_options: Optional[ModuleOptions] = None,
        last_update: float = -1,
        dependencies: Optional[List[DaskModule]] = None,
    ) -> Tuple[str, Optional[DaskModule]]:
        """Get the task `name` run on indices.

        It will spawn the task if not there.

        Args:
            task_name: Name of the task.
            dataset_split_name: Which dataset split to use.
            mod_options: Options for the module.
            last_update: Last known update of the dataset_split.
            dependencies: Which Modules should complete before this one.

        Returns:
            Key and task.

        Raises:
            TaskManagerLockedException if the task manager is locked

        """
        if self._is_locked:
            raise TaskManagerLockedException("Can't get/start tasks when TaskManager is locked!")
        task_cls = self.tasks.get(task_name)
        if mod_options:
            mod_options = mod_options.copy(deep=True)
        else:
            mod_options = ModuleOptions()

        if task_cls is not None:
            # We found the task, we can instantiate it.
            if isinstance(task_name, SupportedMethod):
                mod_options = mod_options.copy(update={"model_contract_method_name": task_name})

            task: DaskModule = task_cls(
                dataset_split_name=dataset_split_name,
                config=self.config.copy(deep=True),
                mod_options=mod_options,
            )
            # Check if this task already exist.
            key = task.task_id
            task = self.current_tasks.setdefault(key, task)

            is_expired = isinstance(task, ExpirableMixin) and task.is_expired(last_update)
            if task.should_be_started() or is_expired:
                if dependencies is not None:
                    dependencies = [d for d in dependencies if not d.done()]
                task.start_task_on_dataset_split(self.client, dependencies=dependencies)

            return key, task
        else:
            log.error("Task not found!", name=task_name)
            return "", None

    def get_custom_task(
        self,
        task_name: SupportedTask,
        custom_query: Dict[str, Any],
        mod_options: Optional[ModuleOptions] = None,
    ) -> Tuple[str, Optional[DaskModule]]:
        """Get the task `name` run on a custom query.

        It will spawn the task if not there.

        Args:
            task_name: Name of the task.
            custom_query: Query fed to the Module.
            mod_options: Options for the module.

        Returns:
            Key and task.

        Raises:
            TaskManagerLockedException if the task manager is locked

        """
        if self._is_locked:
            raise TaskManagerLockedException("Can't get/start tasks when TaskManager is locked!")
        task_cls: Optional[Callable] = self.tasks.get(task_name)
        mod_options = mod_options or ModuleOptions()
        mod_options.model_contract_method_name = (
            task_name if isinstance(task_name, SupportedMethod) else None
        )
        if task_cls is not None:
            # We found the task, we can instantiate it.
            task: DaskModule = task_cls(
                dataset_split_name=DatasetSplitName.eval,  # Placeholder
                config=self.config.copy(deep=True),
                mod_options=mod_options,
            )
            # Check if this task already exist.
            key = task.custom_query_task_id(custom_query)
            task = self.current_tasks.setdefault(key, task)

            # Always start task
            task.start_task(self.client, custom_query)
            return key, task
        else:
            log.warning("Task not found!", name=task_name)
            return "", None

    def status(self):
        """Utils method to get the status of everything."""
        cluster = (self.cluster.workers,)
        return {
            "cluster": cluster,
            "config": self.config.dict(),
            **self.get_all_tasks_status(task=None),
        }

    def restart(self):
        for task_name, module in self.current_tasks.items():
            module.future = None
        self.client.restart()
        log.info("Cluster restarted to free memory.")
