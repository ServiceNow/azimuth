# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

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
from azimuth.types.word_analysis import TopWordsResponse
from azimuth.utils.routers import (
    build_named_dataset_filters,
    get_standard_task_result,
    require_pipeline_index,
)

router = APIRouter()

TAGS = ["Top Words v1"]


@router.get(
    "",
    summary="Get most important words.",
    description="Get most important words for right predictions and errors based on filters.",
    tags=TAGS,
    response_model=TopWordsResponse,
)
def get_top_words(
    dataset_split_name: DatasetSplitName,
    named_filters: NamedDatasetFilters = Depends(build_named_dataset_filters),
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
    without_postprocessing: bool = Query(
        False, title="Without Postprocessing", alias="withoutPostprocessing"
    ),
) -> TopWordsResponse:

    mod_options = ModuleOptions(
        filters=named_filters.to_dataset_filters(dataset_split_manager.get_class_names()),
        pipeline_index=pipeline_index,
        force_no_saliency=pipeline_index is None,
        without_postprocessing=without_postprocessing,
    )

    task_result: TopWordsResponse = get_standard_task_result(
        SupportedModule.TopWords,
        dataset_split_name,
        task_manager,
        mod_options=mod_options,
        last_update=dataset_split_manager.last_update,
    )[0]

    return task_result
