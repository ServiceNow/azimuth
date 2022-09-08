# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST

from azimuth.app import get_dataset_split_manager_mapping, get_task_manager
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName
from azimuth.types.tag import (
    DataAction,
    DataActionMapping,
    DataActionResponse,
    PostDataActionRequest,
)
from azimuth.utils.routers import query_pipeline_index

router = APIRouter()

TAGS = ["Tag v1"]


@router.post(
    "",
    summary="Post data_action tags",
    description="Post new data_action tags",
    tags=TAGS,
    response_model=DataActionResponse,
)
def post_data_actions(
    request_data: PostDataActionRequest = Body(...),
    dataset_split_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = Depends(
        get_dataset_split_manager_mapping
    ),
    task_manager: TaskManager = Depends(get_task_manager),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
) -> DataActionResponse:
    # Remove NO_ACTION as it is only used in filtering.
    for actions in request_data.data_actions.values():
        actions.pop(DataAction.no_action, None)

    dataset = dataset_split_managers.get(request_data.dataset_split_name)
    if dataset is None:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Dataset not found.")
    try:
        table_key = (
            None
            if pipeline_index is None
            else PredictionTableKey.from_pipeline_index(
                pipeline_index,
                task_manager.config,
            )
        )
        dataset.add_tags(request_data.data_actions, table_key)
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=e.args[0])
    task_manager.clear_worker_cache()
    updated_tags = dataset.get_tags(list(request_data.data_actions.keys()), table_key=table_key)
    return DataActionResponse(data_actions=[DataActionMapping(**x) for x in updated_tags])
