# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List

from fastapi import APIRouter, Depends, Query

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
    ConfidenceBinDetails,
    ConfidenceHistogramResponse,
)
from azimuth.utils.routers import (
    build_named_dataset_filters,
    get_standard_task_result,
    require_pipeline_index,
)

router = APIRouter()

TAGS = ["Confidence Histogram v1"]


@router.get(
    "",
    summary="Get confidence histogram values",
    description="Get all confidence bins with their confidence and the outcome count",
    tags=TAGS,
    response_model=List[ConfidenceBinDetails],
)
def get_confidence_histogram(
    dataset_split_name: DatasetSplitName,
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
    without_postprocessing: bool = Query(
        False, title="Without Postprocessing", alias="withoutPostprocessing"
    ),
) -> List[ConfidenceBinDetails]:
    mod_options = ModuleOptions(
        filters=named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        pipeline_index=pipeline_index,
        without_postprocessing=without_postprocessing,
    )

    result: ConfidenceHistogramResponse = get_standard_task_result(
        task_name=SupportedModule.ConfidenceHistogram,
        dataset_split_name=dataset_split_name,
        task_manager=task_manager,
        mod_options=mod_options,
        last_update=dataset_split_manager.last_update,
    )[0]

    return result.details_all_bins
