# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from fastapi import APIRouter, Depends

from azimuth.app import get_dataset_split_manager, get_task_manager
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
    OutcomeCountPerThresholdValue,
)
from azimuth.utils.routers import (
    build_named_dataset_filters,
    get_standard_task_result,
    require_pipeline_index,
)

router = APIRouter()

TAGS = ["Outcome Count v1"]


@router.get(
    "/per_threshold",
    summary="Get outcome count for multiple thresholds.",
    description="Get prediction count per outcome for multiple thresholds.",
    tags=TAGS,
    response_model=List[OutcomeCountPerThresholdValue],
)
def get_outcome_count_per_threshold(
    dataset_split_name: DatasetSplitName,
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
) -> List[OutcomeCountPerThresholdValue]:
    mod_options = ModuleOptions(
        filters=named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        pipeline_index=pipeline_index,
    )

    task_result: List[OutcomeCountPerThresholdResponse] = get_standard_task_result(
        SupportedModule.OutcomeCountPerThreshold,
        dataset_split_name,
        task_manager,
        mod_options=mod_options,
        last_update=dataset_split_manager.last_update,
    )

    if len(task_result) == 0:
        # Non-Editable postprocessing
        return []

    return task_result[0].outcome_count_all_thresholds


@router.get(
    "/per_filter",
    summary="Get outcome count for each filter.",
    description="Get outcome count for each filter based on the current filtering.",
    tags=TAGS,
    response_model=OutcomeCountPerFilterResponse,
)
def get_outcome_count_per_filter(
    dataset_split_name: DatasetSplitName,
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
) -> OutcomeCountPerFilterResponse:
    mod_options = ModuleOptions(
        filters=named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        pipeline_index=pipeline_index,
    )

    task_result: OutcomeCountPerFilterResponse = get_standard_task_result(
        SupportedModule.OutcomeCountPerFilter,
        dataset_split_name,
        task_manager,
        mod_options=mod_options,
        last_update=dataset_split_manager.last_update,
    )[0]

    return task_result
