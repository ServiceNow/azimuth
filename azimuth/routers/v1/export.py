# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import os
import time
from os.path import join as pjoin
from typing import Dict, Generator, List, Optional, cast

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from starlette.status import HTTP_404_NOT_FOUND

from azimuth.app import (
    get_all_dataset_split_managers,
    get_config,
    get_dataset_split_manager,
    get_task_manager,
)
from azimuth.config import AzimuthConfig
from azimuth.dataset_split_manager import DatasetSplitManager, PredictionTableKey
from azimuth.task_manager import TaskManager
from azimuth.types import (
    DatasetColumn,
    DatasetSplitName,
    ModuleOptions,
    SupportedModule,
)
from azimuth.types.perturbation_testing import (
    PerturbationTestSummary,
    PerturbedUtteranceDetailedResult,
    PerturbedUtteranceResult,
)
from azimuth.utils.conversion import orjson_dumps
from azimuth.utils.project import perturbation_testing_available
from azimuth.utils.routers import (
    get_last_update,
    get_standard_task_result,
    query_pipeline_index,
    require_available_model,
    require_pipeline_index,
)
from azimuth.utils.validation import assert_not_none

router = APIRouter()

TAGS = ["Export v1"]


@router.get(
    "/dataset_splits/{dataset_split_name}/utterances",
    summary="Export dataset_split as csv.",
    description="Export the dataset_split to a CSV file and returns it.",
    tags=TAGS,
    response_class=FileResponse,
)
def export_dataset(
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: Optional[int] = Depends(query_pipeline_index),
    config: AzimuthConfig = Depends(get_config),
) -> FileResponse:
    table_key = (
        None
        if pipeline_index is None
        else PredictionTableKey.from_pipeline_index(pipeline_index, config)
    )
    pt = dataset_split_manager.save_csv(table_key=table_key)

    filename = os.path.basename(pt)
    return FileResponse(path=pt, filename=filename)


@router.get(
    "/dataset_splits/{dataset_split_name}/proposed_actions",
    summary="Export proposed actions as csv.",
    description="Export proposed actions to a CSV file and returns it.",
    tags=TAGS,
    response_class=FileResponse,
)
def export_proposed_actions(
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
) -> FileResponse:
    pt = dataset_split_manager.save_proposed_actions_to_csv()
    return FileResponse(path=pt, filename=os.path.basename(pt))


@router.get(
    "/perturbation_testing_summary",
    summary="Export perturbation testing summary as csv.",
    description="Export the perturbation testing summary to a CSV file and returns it.",
    tags=TAGS,
    response_class=FileResponse,
    dependencies=[Depends(require_available_model)],
)
def get_export_perturbation_testing_summary(
    task_manager: TaskManager = Depends(get_task_manager),
    config: AzimuthConfig = Depends(get_config),
    dataset_managers: Dict[DatasetSplitName, Optional[DatasetSplitManager]] = Depends(
        get_all_dataset_split_managers
    ),
    pipeline_index: int = Depends(require_pipeline_index),
) -> FileResponse:
    if not perturbation_testing_available(config):
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="No summary available.")

    eval_dm = dataset_managers[DatasetSplitName.eval]
    train_dm = dataset_managers[DatasetSplitName.train]

    last_update = get_last_update([eval_dm, train_dm])

    task_result: List[PerturbationTestSummary] = get_standard_task_result(
        SupportedModule.PerturbationTestingSummary,
        DatasetSplitName.all,
        task_manager=task_manager,
        last_update=last_update,
        mod_options=ModuleOptions(pipeline_index=pipeline_index),
    )[0].all_tests_summary

    cfg = task_manager.config
    df = pd.DataFrame.from_records([t.dict() for t in task_result])
    df["example"] = df["example"].apply(lambda i: i["perturbedUtterance"])
    file_label = time.strftime("%Y%m%d_%H%M%S", time.localtime())

    filename = f"azimuth_export_behavioral_testing_summary_{cfg.name}_{file_label}.csv"

    pt = pjoin(cfg.get_artifact_path(), filename)

    df.to_csv(pt, index=False)

    return FileResponse(path=pt, filename=filename)


@router.get(
    "/dataset_splits/{dataset_split_name}/perturbed_utterances",
    summary="Export perturbed dataset split as json.",
    description="Export the perturbed dataset split (training or evaluation) to a JSON file and "
    "returns it.",
    tags=TAGS,
    response_class=FileResponse,
    dependencies=[Depends(require_available_model)],
)
def get_export_perturbed_set(
    dataset_split_name: DatasetSplitName,
    task_manager: TaskManager = Depends(get_task_manager),
    dataset_split_manager: DatasetSplitManager = Depends(get_dataset_split_manager),
    pipeline_index: int = Depends(require_pipeline_index),
    config: AzimuthConfig = Depends(get_config),
) -> FileResponse:
    pipeline_index_not_null = assert_not_none(pipeline_index)
    file_label = time.strftime("%Y%m%d_%H%M%S", time.localtime())
    cfg = task_manager.config

    filename = f"azimuth_export_modified_set_{cfg.name}_{dataset_split_name}_{file_label}.json"
    pt = pjoin(cfg.get_artifact_path(), filename)

    task_result: List[List[PerturbedUtteranceResult]] = get_standard_task_result(
        SupportedModule.PerturbationTesting,
        dataset_split_name,
        task_manager,
        mod_options=ModuleOptions(pipeline_index=pipeline_index_not_null),
    )

    output = list(
        make_utterance_level_result(
            dataset_split_manager, task_result, pipeline_index=pipeline_index_not_null
        )
    )
    with open(pt, "w") as f:
        f.write(orjson_dumps(output).decode())
    return FileResponse(path=pt, filename=filename)


def make_utterance_level_result(
    dm: DatasetSplitManager, results: List[List[PerturbedUtteranceResult]], pipeline_index: int
) -> Generator[Dict, None, None]:
    """Massage perturbation testing results for the frontend.

    Args:
        dm: Current DatasetSplitManager.
        results: Output of Perturbation Testing.
        pipeline_index: Index of the pipeline that made the results.

    Returns:
        Generator that yield json-able object for the frontend.

    """
    config = cast(AzimuthConfig, dm.config)
    for idx, (utterance, test_results) in enumerate(
        zip(
            dm.get_dataset_split(
                PredictionTableKey.from_pipeline_index(
                    pipeline_index,
                    config,
                )
            ),
            results,
        )
    ):
        for test in test_results:
            yield PerturbedUtteranceDetailedResult(
                original_prediction=dm.get_class_names()[
                    utterance[DatasetColumn.postprocessed_prediction]
                ],
                original_utterance=utterance[dm.config.columns.text_input],
                original_confidence=utterance[DatasetColumn.postprocessed_confidences][0],
                label=dm.get_class_names()[utterance[dm.config.columns.label]],
                **{**test.dict(), "prediction": dm.get_class_names()[test.prediction]},
            ).dict()
