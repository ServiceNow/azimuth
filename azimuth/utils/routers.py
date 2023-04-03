# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from threading import Event
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, Query
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
    HTTP_503_SERVICE_UNAVAILABLE,
)

from azimuth.app import get_config, get_ready_flag, get_startup_tasks, get_task_manager
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import Module
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    NamedDatasetFilters,
    PaginationParams,
    SupportedTask,
)
from azimuth.types.outcomes import OutcomeName
from azimuth.types.tag import DataAction, SmartTag, SmartTagFamily
from azimuth.utils.project import predictions_available


def get_last_update(dataset_split_managers: List[Optional[DatasetSplitManager]]) -> float:
    last_update = max([dsm.last_update if dsm else -1 for dsm in dataset_split_managers])

    return last_update


def build_named_dataset_filters(
    confidence_min: float = Query(0, title="Minimum confidence"),
    confidence_max: float = Query(1, title="Maximum confidence"),
    label: List[str] = Query([], title="Label"),
    prediction: List[str] = Query([], title="Prediction"),
    extreme_length: List[SmartTag] = Query([], title="Extreme length"),
    partial_syntax: List[SmartTag] = Query([], title="Partial syntax"),
    dissimilar: List[SmartTag] = Query([], title="Dissimilar"),
    almost_correct: List[SmartTag] = Query([], title="Almost correct"),
    behavioral_testing: List[SmartTag] = Query([], title="Behavioral testing"),
    pipeline_comparison: List[SmartTag] = Query([], title="Pipeline comparison"),
    uncertain: List[SmartTag] = Query([], title="Uncertain"),
    data_action: List[DataAction] = Query([], title="Data action tags"),
    outcome: List[OutcomeName] = Query([], title="Outcomes"),
    utterance: Optional[str] = Query(None, title="Utterance"),
) -> NamedDatasetFilters:
    """Build the named filter component. Intended as a FastAPI endpoint dependency.

    Args:
        confidence_min: The desired minimum confidence
        confidence_max: The desired maximum confidence
        label: The desired class labels
        prediction: The desired class predictions
        extreme_length: The desired `extreme_length` smart tags
        partial_syntax: The desired `partial_syntax` smart tags
        dissimilar: The desired `dissimilar` smart tags
        almost_correct: The desired `almost_correct` smart tags
        behavioral_testing: The desired `behavioral_testing` smart tags
        pipeline_comparison: The desired `pipeline_comparison` smart tags
        uncertain: The desired `uncertain` smart tags
        data_action: The desired data_action tags
        outcome: The desired outcomes
        utterance: The substring desired in each utterance

    Returns:
        The named dataset filter object
    """

    return NamedDatasetFilters(
        confidence_min=confidence_min,
        confidence_max=confidence_max,
        label=label,
        prediction=prediction,
        smart_tags={
            SmartTagFamily.extreme_length: extreme_length,
            SmartTagFamily.partial_syntax: partial_syntax,
            SmartTagFamily.dissimilar: dissimilar,
            SmartTagFamily.almost_correct: almost_correct,
            SmartTagFamily.behavioral_testing: behavioral_testing,
            SmartTagFamily.pipeline_comparison: pipeline_comparison,
            SmartTagFamily.uncertain: uncertain,
        },
        data_action=data_action,
        utterance=utterance,
        outcome=outcome,
    )


def get_standard_task_result(
    task_name: SupportedTask,
    dataset_split_name: DatasetSplitName,
    task_manager: TaskManager,
    mod_options: Optional[ModuleOptions] = None,
    last_update: float = -1,
):
    """Generate the task object and get the result for standard tasks.

    Args:
        task_name: The task name e.g. ConfidenceHistogram
        dataset_split_name: e.g. DatasetSplitName.eval
        task_manager: The task manager
        mod_options: Module options to pass to the task launcher
        last_update: The last known update for this dataset_split, to know if we need to recompute.

    Returns:
        The task result

    Raises:
        HTTPException when the requested module doesn't exist.
    """

    _, task = task_manager.get_task(
        task_name=task_name,
        dataset_split_name=dataset_split_name,
        mod_options=mod_options,
        last_update=last_update,
    )

    if not task:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail=f"Task not found {task_name}")

    task_result = task.result()
    task.clear()
    return task_result


def get_custom_task_result(
    task_name: SupportedTask,
    task_manager: TaskManager,
    custom_query: Dict[str, Any],
    mod_options: Optional[ModuleOptions] = None,
):
    """Generate the task object and get the result for custom tasks.

    Args:
        task_name: The task name e.g. ConfidenceHistogram
        task_manager: The task manager
        custom_query: A dictionary specifying the custom query
        mod_options: Options to pass to the task launcher

    Returns:
        The task result

    Raises:
        HTTPException when the requested module doesn't exist.
    """
    _, task = task_manager.get_custom_task(
        task_name=task_name, custom_query=custom_query, mod_options=mod_options
    )
    if not task:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Aggregation not found")

    return task.result()


def require_pipeline_index(
    pipeline_index: int = Query(..., title="Pipeline index", ge=0),
    config: AzimuthConfig = Depends(get_config),
):
    return query_pipeline_index(pipeline_index, config)


def query_pipeline_index(
    pipeline_index: Optional[int] = Query(None, title="Pipeline index", ge=0),
    config: AzimuthConfig = Depends(get_config),
) -> Optional[int]:
    """Get and validate the pipeline index from query parameters.

    Args:
        pipeline_index: Which pipeline to select in the config.
        config: App config

    Returns:
        Validated pipeline_index.

    Raises:
        HTTPException(400) on validation error.
    """
    if pipeline_index is None:
        return pipeline_index
    elif config.pipelines is None:
        raise HTTPException(
            HTTP_400_BAD_REQUEST,
            detail=f"Current config has no pipeline specified,"
            f" but pipeline index {pipeline_index} was requested.",
        )
    elif len(config.pipelines) < pipeline_index:
        raise HTTPException(
            HTTP_400_BAD_REQUEST,
            detail=f"Current config has {len(config.pipelines)} models specified,"
            f" but pipeline index {pipeline_index} was requested.",
        )
    return pipeline_index


def require_available_model(
    config: AzimuthConfig = Depends(get_config),
    pipeline_index: int = Depends(require_pipeline_index),
):
    if not predictions_available(config) or pipeline_index is None:
        raise HTTPException(
            400, detail="This route requires a pipeline, but none was provided in the config."
        )


def require_application_ready(
    startup_tasks: Optional[Dict[str, Module]] = Depends(get_startup_tasks),
    ready_flag: Optional[Event] = Depends(get_ready_flag),
    task_manager: TaskManager = Depends(get_task_manager),
) -> bool:
    """Check if the application is ready.

    If all startup tasks are done, the app is ready. This is costly to check so we have
    `ready_flag` to skip future checks.

    Args:
        startup_tasks: All startup tasks.
        ready_flag: Event that if set, means the app is already ready.
        task_manager: Task Manager.

    Returns:
        True when the application is ready.

    Raises:
        HTTPException: When the startup tasks are not completed.

    """

    def startup_tasks_completed(
        startup_tasks: Optional[Dict[str, Module]], task_manager: TaskManager
    ):
        startup_task_ready = startup_tasks is not None and all(
            st.done() or st.status() == "error" for st in startup_tasks.values()
        )
        return startup_task_ready and not task_manager.is_locked

    if ready_flag is not None and ready_flag.is_set():
        # Skip verification
        return True
    if not startup_tasks_completed(startup_tasks, task_manager):
        # 503 Not available
        raise HTTPException(
            status_code=HTTP_503_SERVICE_UNAVAILABLE,
            detail="Application is not ready, try again later.",
        )
    if ready_flag is not None:
        # The app is ready, we set a flag to speedup checks in the future.
        ready_flag.set()
    return True


def get_pagination(
    limit: Optional[int] = Query(None, title="Limit", ge=1),
    offset: Optional[int] = Query(None, title="Offset", ge=0),
) -> Optional[PaginationParams]:
    """Get the pagination parameters if available.

    Args:
        limit: How many items to return.
        offset: Starting point.

    Raises:
        HTTPException if not all params are supplied.

    Returns:
        If limit and offset are provided, returns a PaginationParams otherwise None.

    """
    if (limit is None) ^ (offset is None):
        raise HTTPException(
            HTTP_400_BAD_REQUEST,
            detail=f"`limit` and `offset` must be all set or all null. Got {limit} and {offset}",
        )
    if (limit is None) and (offset is None):
        return None
    else:
        return PaginationParams(limit=limit, offset=offset)
