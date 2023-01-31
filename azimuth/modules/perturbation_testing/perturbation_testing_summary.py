# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from dataclasses import dataclass
from typing import List, Optional

import pandas as pd

from azimuth.config import PerturbationTestingConfig
from azimuth.modules.base_classes import ComparisonModule
from azimuth.modules.perturbation_testing import PerturbationTestingModule
from azimuth.modules.task_execution import get_task_result
from azimuth.types import DatasetSplitName, ModuleOptions
from azimuth.types.perturbation_testing import (
    PerturbationTestFailureReason,
    PerturbationTestFamily,
    PerturbationTestingMergedResponse,
    PerturbationTestingSummaryResponse,
    PerturbationTestName,
    PerturbationTestSummary,
    PerturbationType,
    PerturbedUtteranceExample,
    PerturbedUtteranceResult,
)


@dataclass
class PerturbedUtteranceNeededInfo:
    name: PerturbationTestName
    description: str
    family: PerturbationTestFamily
    perturbation_type: PerturbationType
    original_utterance: str
    perturbed_utterance: str
    confidence_delta: Optional[float]
    dataset_split_name: DatasetSplitName
    is_failed: bool
    failure_reason: PerturbationTestFailureReason


PERTURBATION_TEST_GROUPING = ["family", "name", "perturbation_type", "dataset_split_name"]


class PerturbationTestingSummaryModule(ComparisonModule[PerturbationTestingConfig]):
    """Summary of perturbation tests per dataset split."""

    required_mod_options = {"pipeline_index"}

    def compute_on_dataset_split(  # type: ignore
        self,
    ) -> List[PerturbationTestingSummaryResponse]:
        # Get all the test and make them into a DataFrame
        all_tests = self.get_all_tests()
        df = pd.DataFrame(all_tests)
        grouped = df.groupby(PERTURBATION_TEST_GROUPING)
        # We select the first example as the test example.
        examples = grouped.first().reset_index()
        # Compute failure rate per dataset_split.
        grouped_with_set = grouped["is_failed"]
        grouped_with_set_count = grouped_with_set.count().reset_index()
        grouped_with_set_failed_count = grouped_with_set.sum().reset_index()
        test_ratio = (grouped_with_set.sum() / grouped_with_set.count()).reset_index()
        # Average confidence delta, we filter the -1 first
        not_failed_grouped = df[df["confidence_delta"].notnull()].groupby(
            PERTURBATION_TEST_GROUPING
        )
        average_delta = not_failed_grouped["confidence_delta"].mean().reset_index()

        # Merge everything.

        merged_df = pd.merge(
            examples, test_ratio, on=PERTURBATION_TEST_GROUPING, suffixes=("", "_ratio")
        )

        merged_df = pd.merge(
            merged_df,
            grouped_with_set_count,
            on=PERTURBATION_TEST_GROUPING,
            suffixes=("", "_total_count"),
        )
        merged_df = pd.merge(
            merged_df,
            grouped_with_set_failed_count,
            on=PERTURBATION_TEST_GROUPING,
            suffixes=("", "_count"),
        )
        # Merge left because average_delta can be empty.
        merged_df = pd.merge(
            merged_df,
            average_delta,
            how="left",
            on=PERTURBATION_TEST_GROUPING,
            suffixes=("", "_computed"),
        )
        test_types_info = merged_df.groupby(PERTURBATION_TEST_GROUPING[:-1])

        result = []
        for (family, name, perturbation_type), group in test_types_info:
            record = group.to_dict(orient="records")
            records_by_ds = {r["dataset_split_name"]: r for r in record}
            original_utterance = record[0]["original_utterance"]
            perturbed_utterance = record[0]["perturbed_utterance"]
            description = record[0]["description"]

            def get_stats(dataset_split_name):
                if dataset_split_name in records_by_ds.keys():
                    set_r = records_by_ds[dataset_split_name]
                    failure_rate = set_r["is_failed_ratio"]
                    count = set_r["is_failed_total_count"]
                    failed_count = set_r["is_failed_count"]
                    confidence_delta = set_r["confidence_delta_computed"]
                else:
                    failure_rate, count, failed_count, confidence_delta = (0, 0, 0, 0)

                return failure_rate, count, failed_count, confidence_delta

            test_failure_rate, test_count, test_failed_count, test_confidence_delta = get_stats(
                DatasetSplitName.eval
            )

            train_failure_rate, train_count, train_failed_count, train_confidence_delta = get_stats(
                DatasetSplitName.train
            )

            result.append(
                PerturbationTestSummary(
                    description=description,
                    name=name,
                    example=PerturbedUtteranceExample(
                        utterance=original_utterance, perturbed_utterance=perturbed_utterance
                    ),
                    family=family,
                    perturbation_type=perturbation_type,
                    eval_failure_rate=test_failure_rate,
                    eval_count=test_count,
                    eval_failed_count=test_failed_count,
                    eval_confidence_delta=test_confidence_delta,
                    train_failure_rate=train_failure_rate,
                    train_count=train_count,
                    train_failed_count=train_failed_count,
                    train_confidence_delta=train_confidence_delta,
                )
            )
        return [PerturbationTestingSummaryResponse(all_tests_summary=result)]

    def get_all_tests(self) -> List[PerturbedUtteranceNeededInfo]:
        """Get all CheckList test for all indices of all dataset splits.

        Returns:
            A list with all the tests.
        """
        accumulator = []
        for dataset_split_name in self.available_dataset_splits:
            all_tests = PerturbationTestingModule(
                dataset_split_name=dataset_split_name,
                config=self.config,
                mod_options=ModuleOptions(pipeline_index=self.mod_options.pipeline_index),
            )
            result = get_task_result(
                task_module=all_tests, result_type=List[List[PerturbedUtteranceResult]]
            )
            result_with_utterances = [
                [
                    PerturbedUtteranceNeededInfo(
                        name=perturbed_utterance_result.name,
                        description=perturbed_utterance_result.description,
                        family=perturbed_utterance_result.family,
                        original_utterance=original_utterance,
                        perturbed_utterance=perturbed_utterance_result.perturbed_utterance,
                        perturbation_type=perturbed_utterance_result.perturbation_type,
                        confidence_delta=perturbed_utterance_result.confidence_delta,
                        dataset_split_name=dataset_split_name,
                        is_failed=perturbed_utterance_result.failed,
                        failure_reason=perturbed_utterance_result.failure_reason,
                    )
                    for perturbed_utterance_result in perturbed_utterance_results
                ]
                for original_utterance, perturbed_utterance_results in zip(
                    self.get_dataset_split(dataset_split_name)[self.config.columns.text_input],
                    result,
                )
            ]
            # Merge all test
            merged_result: List[PerturbedUtteranceNeededInfo] = sum(result_with_utterances, [])
            accumulator += merged_result
        return accumulator


class PerturbationTestingMergedModule(PerturbationTestingSummaryModule):
    """Failure rate per dataset split for perturbation tests."""

    def compute_on_dataset_split(self) -> List[PerturbationTestingMergedResponse]:  # type: ignore
        all_tests = self.get_all_tests()
        df = pd.DataFrame(all_tests)

        # Compute failure rate per dataset_split.
        grouped_with_set = df.groupby("dataset_split_name")["is_failed"]
        test_ratio = (grouped_with_set.sum() / grouped_with_set.count()).reset_index()
        eval_fr = next(
            iter(
                test_ratio[test_ratio["dataset_split_name"] == DatasetSplitName.eval]["is_failed"]
            ),
            0.0,
        )
        train_fr = next(
            iter(
                test_ratio[test_ratio["dataset_split_name"] == DatasetSplitName.train]["is_failed"]
            ),
            0.0,
        )

        return [
            PerturbationTestingMergedResponse(
                eval_failure_rate=eval_fr, train_failure_rate=train_fr
            )
        ]
