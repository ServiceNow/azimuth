# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, List

from fastapi import APIRouter, Depends

from azimuth.app import get_dataset_split_manager_mapping, get_task_manager
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, SupportedModule
from azimuth.types.dataset_warnings import DatasetWarningGroup, DatasetWarningsResponse
from azimuth.utils.routers import get_last_update, get_standard_task_result

router = APIRouter()

TAGS = ["Dataset Warnings v1"]


@router.get(
    "",
    summary="Get dataset warnings.",
    description="Get the warnings related to the dataset, such as differences between the training "
    "and the evaluation set.",
    tags=TAGS,
    response_model=List[DatasetWarningGroup],
)
def get_dataset_warnings(
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_managers: Dict[DatasetSplitName, DatasetSplitManager] = Depends(
        get_dataset_split_manager_mapping
    ),
) -> List[DatasetWarningGroup]:

    task_result: DatasetWarningsResponse = get_standard_task_result(
        SupportedModule.DatasetWarnings,
        dataset_split_name=DatasetSplitName.all,
        task_manager=task_manager,
        last_update=get_last_update(list(dataset_split_managers.values())),
    )[0]

    return task_result.warning_groups
