# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, cast

import numpy as np
from datasets import Dataset

from azimuth.config import PerturbationTestingConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DatasetResultModule
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.types import (
    DatasetColumn,
    DatasetSplitName,
    ModuleOptions,
    SupportedMethod,
)
from azimuth.types.perturbation_testing import (
    PRETTY_PERTURBATION_TYPES,
    PerturbationTestClass,
    PerturbationTestFamily,
    PerturbationTestName,
    PerturbationTestType,
    PerturbationType,
    PerturbedUtteranceDetails,
    PerturbedUtteranceResult,
)
from azimuth.types.tag import SmartTag
from azimuth.types.task import PredictionResponse
from azimuth.utils.conversion import flatten
from azimuth.utils.ml.perturbation_functions import (
    add_all_neutral_tokens,
    remove_or_add_contractions,
    remove_or_add_final_period,
    remove_or_add_final_question_mark,
    remove_or_add_inside_comma,
    remove_or_add_inside_period,
    typo,
)
from azimuth.utils.ml.perturbation_test import PerturbationTest
from azimuth.utils.ml.seeding import RandomContext
from azimuth.utils.validation import assert_not_none


class PerturbationTestingModule(DatasetResultModule[PerturbationTestingConfig]):
    """
    This module generates perturbed utterances based on a list of perturbation tests and
    provides detailed results on the prediction results for the new perturbed utterances.

    Notes:
        To add a new test:
            1. In `perturbation_functions.py`, make a new function with the same
            signature as the `typo` one.
            2. Add your test in self.perturbation_test with your function.

    """

    allowed_mod_options = DatasetResultModule.allowed_mod_options | {"pipeline_index"}

    def __init__(
        self,
        dataset_split_name: DatasetSplitName,
        config: PerturbationTestingConfig,
        mod_options: Optional[ModuleOptions] = None,
    ):

        super().__init__(dataset_split_name, config, mod_options)
        self.perturbation_testing_config = assert_not_none(self.config.behavioral_testing)
        self.perturbation_tests = [
            PerturbationTest(
                name=PerturbationTestName.neutral_token,
                description="{type} a neutral token to the utterance.",
                test_fn=add_all_neutral_tokens,
                family=PerturbationTestFamily.fuzzy_matching,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.neutral_token.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.question_mark,
                description="{type} question mark at the end of the utterance.",
                test_fn=remove_or_add_final_question_mark,
                family=PerturbationTestFamily.punctuation,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.punctuation.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.ending_period,
                description="{type} period at the end of the utterance.",
                test_fn=remove_or_add_final_period,
                family=PerturbationTestFamily.punctuation,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.punctuation.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.inner_comma,
                description="{type} comma inside the utterance.",
                test_fn=remove_or_add_inside_comma,
                family=PerturbationTestFamily.punctuation,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.punctuation.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.inner_period,
                description="{type} period inside the utterance.",
                test_fn=remove_or_add_inside_period,
                family=PerturbationTestFamily.punctuation,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.punctuation.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.typos,
                description="{type} characters in the utterance to create typos.",
                test_fn=typo,
                family=PerturbationTestFamily.fuzzy_matching,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.typo.threshold,
                expect_flip=False,
            ),
            PerturbationTest(
                name=PerturbationTestName.contractions,
                description="{type} expressions in the utterance.",
                family=PerturbationTestFamily.fuzzy_matching,
                test_fn=remove_or_add_contractions,
                test_type=PerturbationTestType.invariant,
                test_class=PerturbationTestClass.robustness,
                conf_delta_threshold=self.perturbation_testing_config.fuzzy_matching.threshold,
                expect_flip=False,
            ),
        ]

    def get_preds(self, batch: Dataset) -> List[Tuple[int, float]]:
        """Calls the prediction task to get new predictions for the perturbed utterances.

        Args:
            batch: batch of utterances to run inference on.

        Returns:
            list of predictions Tuple[result, confidence].

        """
        # INFO: creating this object cost nothing.
        predict_task = model_contract_task_mapping(
            dataset_split_name=self.dataset_split_name,
            config=self.config,
            mod_options=ModuleOptions(
                model_contract_method_name=SupportedMethod.Predictions,
                pipeline_index=self.mod_options.pipeline_index,
            ),
        )
        result: List[PredictionResponse] = predict_task.compute(batch)
        top_probs = [float(np.max(record.postprocessed_output.probs)) for record in result]
        preds = [int(record.postprocessed_output.preds) for record in result]
        return list(zip(preds, top_probs))

    def get_test_results(
        self, perturbation_test: PerturbationTest, batch: Dataset
    ) -> Dict[int, Optional[List[PerturbedUtteranceResult]]]:
        """
        Calculates the confidence on the newly perturbed utterances, checks whether the
        test fails and populates the resulting list.

        Args:
            perturbation_test: Perturbation test to create.
            batch: The original utterances.

        Returns:
            results as Dict[int, List[PerturbedUtteranceResult]].
            For each perturbed_utterance, we have a list of test.
            A list may be empty if a test case is not available (ex: contractions)

        """
        results: Dict[int, Optional[List[PerturbedUtteranceResult]]] = {}
        original_preds = self.get_preds(batch=batch)
        original_labels = batch[self.config.columns.label]
        row_indices = batch[DatasetColumn.row_idx]
        original_utterances = cast(List[str], batch[self.config.columns.text_input])
        # Create perturbed utterances.
        all_perturbed_utterance_details = self.generate_perturbations(
            original_utterances, perturbation_test
        )
        formatted_indices: List[int] = sum(
            [
                [row_indices[i]] * len(all_perturbed_utterance_details[i])
                for i in range(len(row_indices))
            ],
            [],
        )
        batch_all_perturbations = Dataset.from_dict(
            {
                self.config.columns.text_input: flatten(
                    [
                        [test.perturbed_utterance for test in utterance_tests]
                        for utterance_tests in all_perturbed_utterance_details
                    ]
                ),
                self.config.columns.label: flatten(
                    [
                        [original_labels[idx] for _ in range(len(utterance_tests))]
                        for idx, utterance_tests in enumerate(all_perturbed_utterance_details)
                    ]
                ),
                DatasetColumn.row_idx: formatted_indices,
            }
        )
        perturbed_predictions = (
            self.get_preds(batch_all_perturbations)
            if batch_all_perturbations[DatasetColumn.row_idx]
            else []
        )
        perturbed_predictions_per_indices = defaultdict(list)
        for row_idx, pred in zip(formatted_indices, perturbed_predictions):
            perturbed_predictions_per_indices[row_idx].append(pred)

        for idx, (original_pred, perturbed_utterance_details, original_idx) in enumerate(
            zip(original_preds, all_perturbed_utterance_details, row_indices)
        ):
            if perturbed_utterance_details:
                perturbed_utterance_preds = perturbed_predictions_per_indices[original_idx]
                # Check if the test has failed or not for each perturbed utterance.
                test_passed = [
                    perturbation_test.is_failed(perturbed_utterance_pred, original_pred)
                    for perturbed_utterance_pred in perturbed_utterance_preds
                ]
                # Create PerturbedUtteranceResult based on the result.
                perturbed_utterance_results = [
                    PerturbedUtteranceResult(
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
                        confidence=new_conf,
                        confidence_delta=delta,
                        failed=failed,
                        failure_reason=reason,
                        prediction=new_pred,
                    )
                    for perturbed_utterance_detail, (new_pred, new_conf), (
                        failed,
                        reason,
                        delta,
                    ) in zip(perturbed_utterance_details, perturbed_utterance_preds, test_passed)
                ]
                results[idx] = perturbed_utterance_results
            else:
                results[idx] = None
        return results

    def generate_perturbations(
        self, utterances: List[str], perturbation_test: PerturbationTest
    ) -> List[List[PerturbedUtteranceDetails]]:
        """Generate new utterances for a perturbation test for a set of utterances.

        Args:
            utterances: Original utterances.
            perturbation_test: Test to run.

        Returns:
            Perturbed utterances for each utterance.

        """
        with RandomContext(self.perturbation_testing_config.seed):
            all_perturbed_utterance_details = [
                perturbation_test.test_fn(ut, self.config) for ut in utterances
            ]
        return all_perturbed_utterance_details

    def compute(self, batch: Dataset) -> List[List[PerturbedUtteranceResult]]:  # type: ignore
        """Calculate all perturbation tests for the given batch.

        Args:
            batch: The original batch.

        Returns:
            List of results for all perturbation tests per provided batch.

        """
        # Get the results on each test on the batch.
        results_per_test = [self.get_test_results(test, batch) for test in self.perturbation_tests]

        records = []
        for idx in range(len(batch[DatasetColumn.row_idx])):
            record = []
            for perturbed_utterance_results in results_per_test:
                perturbed_utterance_result = perturbed_utterance_results[idx]
                if perturbed_utterance_result:
                    # We merge the results of perturbation tests for a perturbed_utterance
                    record.extend(perturbed_utterance_result)
            # We append the results of the perturbation tests for all utterances in the batch
            records.append(record)

        return records

    def _save_result(  # type: ignore
        self, res: List[List[PerturbedUtteranceResult]], dm: DatasetSplitManager
    ):
        """Compute tags related to Perturbation Tests"""
        tags = {}
        for idx, test_results in enumerate(res):
            tag = {
                SmartTag.failed_fuzzy_matching: any(
                    t.failed
                    for t in test_results
                    if t.family == PerturbationTestFamily.fuzzy_matching
                ),
                SmartTag.failed_punctuation: any(
                    t.failed for t in test_results if t.family == PerturbationTestFamily.punctuation
                ),
            }

            tags[idx] = tag
        dm.add_tags(tags, self._get_table_key())
