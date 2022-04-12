# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Type, TypeVar, cast

import structlog
from dask.context import thread_state
from distributed import get_client, rejoin, secede

from azimuth.modules import Module
from azimuth.types.general.alias_model import ModuleResponse

log = structlog.get_logger(__name__)

U = TypeVar("U")


def get_task_result(task_module: Module, result_type: Type[U]) -> U:
    """Schedule task if not done, and get result with any necessary secession.

    Args:
        task_module: The module to get the result from.
        result_type: Type for function/Module result.

    Returns:
        The result of the Module.
    """
    if not task_module.done():
        # We schedule the task
        try:
            task_module.start_task_on_dataset_split(get_client())
        except Exception:
            log.debug("Can't get a Client, launching manually.")
            result = task_module.compute_on_dataset_split()
            task_module._store_data_in_cache(
                result=result, indices=task_module.get_caching_indices()
            )
            return cast(U, result)
    result_from_future = cast(U, safe_get(task_module))
    return result_from_future


def safe_get(future: Module) -> List[ModuleResponse]:
    """Will secede if possible before getting the result.

    Args:
        future: The module to get the result from.

    Returns:
        The result of the Module.
    """
    with WorkerSecede():
        future.wait()  # We wait for everything to be done, callbacks included!
        res = future.result()
    return res


class WorkerSecede:
    """Remove worker from the pool and re-add it when exiting."""

    def __enter__(self):
        can_secede = hasattr(thread_state, "execution_state")
        if can_secede:
            # Inform the scheduler we are waiting
            secede()

    def __exit__(self, exc_type, exc_val, exc_tb):
        can_secede = hasattr(thread_state, "execution_state")
        if can_secede:
            # Ask for control again
            rejoin()
