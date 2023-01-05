# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict

from datasets import Metric, MetricInfo
from fastapi import APIRouter, Depends, HTTPException

from azimuth.app import (
    get_config,
    get_dataset_split_manager_mapping,
    get_ready_flag,
    get_startup_tasks,
    get_task_manager,
)
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import Module
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedModule
from azimuth.types.app import (
    AvailableDatasetSplits,
    DatasetInfoResponse,
    PerturbationTestingSummary,
    StatusResponse,
)
from azimuth.types.perturbation_testing import (
    PerturbationTestingMergedResponse,
    PerturbationTestingSummaryResponse,
)
from azimuth.types.tag import ALL_DATA_ACTION_FILTERS, ALL_SMART_TAG_FILTERS
from azimuth.utils.object_loader import load_custom_object
from azimuth.utils.project import (
    perturbation_testing_available,
    postprocessing_editable,
    predictions_available,
    similarity_available,
)
from azimuth.utils.routers import (
    get_standard_task_result,
    require_application_ready,
    require_available_model,
    require_pipeline_index,
)
from azimuth.utils.validation import assert_not_none

router = APIRouter()

TAGS = ["App v1"]


@router.get(
    "/status",
    summary="Get status",
    description="Get the status of the app",
    response_model=StatusResponse,
    tags=TAGS,
)
def get_status(
    startup_tasks=Depends(get_startup_tasks),
    ready_flag=Depends(get_ready_flag),
    task_manager: TaskManager = Depends(get_task_manager),
) -> StatusResponse:
    try:
        is_ready = require_application_ready(startup_tasks, ready_flag, task_manager)
    except HTTPException:
        is_ready = False

    status_response = StatusResponse(
        startup_tasks_ready=is_ready,
        startup_tasks_status={name: mod.status() for name, mod in startup_tasks.items()},
    )

    return status_response


@router.get(
    "/dataset_info",
    summary="Get dataset info",
    description="Get the current dataset info",
    tags=TAGS,
    response_model=DatasetInfoResponse,
)
def get_dataset_info(
    dataset_split_managers: Dict[DatasetSplitName, DatasetSplitManager] = Depends(
        get_dataset_split_manager_mapping
    ),
    startup_tasks: Dict[str, Module] = Depends(get_startup_tasks),
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
):
    eval_dm = dataset_split_managers.get(DatasetSplitName.eval)
    training_dm = dataset_split_managers.get(DatasetSplitName.train)
    dm = assert_not_none(eval_dm if eval_dm is not None else training_dm)

    model_contract = task_manager.config.model_contract

    return DatasetInfoResponse(
        project_name=config.name,
        class_names=dm.get_class_names(),
        data_actions=ALL_DATA_ACTION_FILTERS,
        smart_tags=ALL_SMART_TAG_FILTERS,
        eval_class_distribution=eval_dm.class_distribution().tolist()
        if eval_dm is not None
        else [],
        train_class_distribution=training_dm.class_distribution().tolist()
        if training_dm is not None
        else [],
        startup_tasks={k: v.status() for k, v in startup_tasks.items()},
        model_contract=model_contract,
        prediction_available=predictions_available(task_manager.config),
        perturbation_testing_available=perturbation_testing_available(task_manager.config),
        available_dataset_splits=AvailableDatasetSplits(
            eval=eval_dm is not None, train=training_dm is not None
        ),
        similarity_available=similarity_available(task_manager.config),
        postprocessing_editable=None
        if config.pipelines is None
        else [
            postprocessing_editable(task_manager.config, idx)
            for idx in range(len(config.pipelines))
        ],
    )


@router.get(
    "/custom_metrics_info",
    summary="Gives information about custom metrics.",
    description="Gives the description of all custom metrics.",
    tags=TAGS,
    response_model=Dict[str, MetricInfo],
)
def custom_metrics_info(
    dataset_split_managers=Depends(get_dataset_split_manager_mapping),
    config: AzimuthConfig = Depends(get_config),
) -> Dict[str, MetricInfo]:
    result = {}
    dm = dataset_split_managers.get(DatasetSplitName.eval) or dataset_split_managers.get(
        DatasetSplitName.train
    )
    for metric_name, metric_obj_def in config.metrics.items():
        met: Metric = load_custom_object(
            metric_obj_def,
            label_list=dm.get_class_names(),
            rejection_class_idx=dm.rejection_class_idx,
            force_kwargs=True,  # Set True here as load_metrics has **kwargs.
        )
        result[metric_name] = met.info
    return result


@router.get(
    "/perturbation_testing_summary",
    summary="Get the perturbation testing summary.",
    description="Get a failure rate per dataset split and per test as well.",
    tags=TAGS,
    response_model=PerturbationTestingSummary,
    dependencies=[Depends(require_application_ready), Depends(require_available_model)],
)
def get_perturbation_testing_summary(
    dataset_split_managers: Dict[DatasetSplitName, DatasetSplitManager] = Depends(
        get_dataset_split_manager_mapping
    ),
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    pipeline_index: int = Depends(require_pipeline_index),
):
    eval_dm = dataset_split_managers.get(DatasetSplitName.eval)
    training_dm = dataset_split_managers.get(DatasetSplitName.train)

    last_update_eval = eval_dm.last_update if eval_dm else 0
    last_update_train = training_dm.last_update if training_dm else 0
    last_update = max(last_update_eval, last_update_train)

    if perturbation_testing_available(config) and pipeline_index is not None:
        perturbation_testing_result: PerturbationTestingMergedResponse = get_standard_task_result(
            SupportedModule.PerturbationTestingMerged,
            dataset_split_name=DatasetSplitName.all,
            task_manager=task_manager,
            last_update=last_update,
            mod_options=ModuleOptions(pipeline_index=pipeline_index),
        )[0]

        failure_rates = {
            DatasetSplitName.eval: perturbation_testing_result.eval_failure_rate,
            DatasetSplitName.train: perturbation_testing_result.train_failure_rate,
        }
    else:
        failure_rates = {}

    response: PerturbationTestingSummaryResponse = get_standard_task_result(
        SupportedModule.PerturbationTestingSummary,
        dataset_split_name=DatasetSplitName.all,
        task_manager=task_manager,
        mod_options=ModuleOptions(pipeline_index=pipeline_index),
    )[0]
    return PerturbationTestingSummary(
        all_tests_summary=response.all_tests_summary, failure_rates=failure_rates
    )
