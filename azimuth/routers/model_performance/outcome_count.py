# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.status import HTTP_400_BAD_REQUEST

from azimuth.app import get_config, get_dataset_split_manager, get_task_manager
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetSplitName,
    ModuleOptions,
    NamedDatasetFilters,
    SupportedModule,
)
from azimuth.types.model_performance import (
    OutcomeCountPerFilterResponse,
    OutcomeCountPerThresholdResponse,
)
from azimuth.utils.routers import (
    build_named_dataset_filters,
    get_standard_task_result,
    require_pipeline_index,
)

router = APIRouter()


@router.get(
    "/per_threshold",
    summary="Get outcome count for multiple thresholds.",
    description="Get prediction count per outcome for multiple thresholds.",
    response_model=OutcomeCountPerThresholdResponse,
)
def get_outcome_count_per_threshold(
    dataset_split_name: DatasetSplitName,
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
) -> OutcomeCountPerThresholdResponse:
    mod_options = ModuleOptions(
        pipeline_index=pipeline_index,
    )

    try:
        task_result: List[OutcomeCountPerThresholdResponse] = get_standard_task_result(
            SupportedModule.OutcomeCountPerThreshold,
            dataset_split_name,
            task_manager,
            config=config,
            mod_options=mod_options,
            last_update=dataset_split_manager.last_update,
        )
    except ValueError as e:
        raise HTTPException(HTTP_400_BAD_REQUEST, detail=str(e))

    return task_result[0]


@router.get(
    "/per_filter",
    summary="Get outcome count for each filter.",
    description="Get outcome count for each filter based on the current filtering.",
    response_model=OutcomeCountPerFilterResponse,
)
def get_outcome_count_per_filter(
    dataset_split_name: DatasetSplitName,
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
    without_postprocessing: bool = Query(False, title="Without Postprocessing"),
) -> OutcomeCountPerFilterResponse:
    mod_options = ModuleOptions(
        filters=named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        pipeline_index=pipeline_index,
        without_postprocessing=without_postprocessing,
    )

    task_result: OutcomeCountPerFilterResponse = get_standard_task_result(
        SupportedModule.OutcomeCountPerFilter,
        dataset_split_name,
        task_manager,
        config=config,
        mod_options=mod_options,
        last_update=dataset_split_manager.last_update,
    )[0]

    return task_result
