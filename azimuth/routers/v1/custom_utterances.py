# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import os
from os.path import join as pjoin
from typing import List

from fastapi import APIRouter, Depends, Query
from starlette.responses import FileResponse

from azimuth.app import get_config, get_task_manager
from azimuth.config import AzimuthConfig
from azimuth.modules.perturbation_testing import PerturbationTestingModule
from azimuth.task_manager import TaskManager
from azimuth.types import DatasetSplitName, ModuleOptions, SupportedMethod
from azimuth.types.perturbation_testing import (
    PRETTY_PERTURBATION_TYPES,
    PerturbationTestFailureReason,
    PerturbationType,
    PerturbedUtteranceDetailedResult,
)
from azimuth.types.task import SaliencyResponse
from azimuth.utils.conversion import orjson_dumps
from azimuth.utils.routers import get_custom_task_result, require_pipeline_index

router = APIRouter()


@router.get(
    "/perturbed_utterances",
    summary="Get perturbed utterances based on custom utterances.",
    description="Get perturbed utterances based on custom utterances.",
)
def get_perturbed_utterances(
    utterances: List[str] = Query([], title="Utterances"),
    config: AzimuthConfig = Depends(get_config),
) -> FileResponse:
    perturb_testing = PerturbationTestingModule(
        dataset_split_name=DatasetSplitName.eval,
        config=config,
        # Mandatory mod_option, but the module doesn't compute any new prediction in this case.
        mod_options=ModuleOptions(pipeline_index=0),
    )
    mocked_test_result = []
    for perturbation_test in perturb_testing.perturbation_tests:
        all_perturbed_utterance_details = perturb_testing.generate_perturbations(
            utterances, perturbation_test=perturbation_test
        )
        perturbation_test_results = [
            PerturbedUtteranceDetailedResult(
                name=perturbation_test.name,
                description=perturbation_test.description.format(
                    type=PRETTY_PERTURBATION_TYPES[
                        PerturbationType(perturbed_utterance_detail.perturbation_type)
                    ]
                ),
                family=perturbation_test.family,
                perturbed_utterance=perturbed_utterance_detail.perturbed_utterance,
                perturbations=perturbed_utterance_detail.perturbations,
                perturbation_type=perturbed_utterance_detail.perturbation_type,
                confidence=0.0,
                confidence_delta=None,
                failed=False,
                failure_reason=PerturbationTestFailureReason.NA,
                prediction="NA",
                original_prediction="NA",
                original_confidence=0.0,
                label="NA",
                original_utterance=original_utt,
            ).dict()
            for original_utt, perturbed_utterance_details in zip(
                utterances, all_perturbed_utterance_details
            )
            for perturbed_utterance_detail in perturbed_utterance_details
        ]
        mocked_test_result += perturbation_test_results

    pt = pjoin(
        config.get_artifact_path(),
        "azimuth_generate_perturbation_tests.json",
    )
    with open(pt, "w") as f:
        f.write(orjson_dumps(mocked_test_result).decode())
    return FileResponse(pt, filename=os.path.basename(pt))


@router.get(
    "/saliency",
    summary="Get saliency for custom utterances.",
    description="Get saliency for custom utterances.",
    response_model=List[SaliencyResponse],
)
def get_saliency(
    utterances: List[str] = Query([], title="Utterances"),
    pipeline_index: int = Depends(require_pipeline_index),
    task_manager: TaskManager = Depends(get_task_manager),
) -> List[SaliencyResponse]:
    task_result: List[SaliencyResponse] = get_custom_task_result(
        SupportedMethod.Saliency,
        task_manager=task_manager,
        custom_query={task_manager.config.columns.text_input: utterances},
        mod_options=ModuleOptions(pipeline_index=pipeline_index),
    )

    return task_result
