# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import List, cast

import numpy as np
from datasets import Dataset

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes import DatasetResultModule, FilterableModule
from azimuth.types import DatasetColumn
from azimuth.types.model_performance import (
    ConfidenceBinDetails,
    ConfidenceHistogramResponse,
)
from azimuth.types.outcomes import ALL_OUTCOMES, OutcomeName
from azimuth.utils.dataset_operations import (
    get_confidences_from_ds,
    get_outcomes_from_ds,
)
from azimuth.utils.validation import assert_not_none

CONFIDENCE_BINS_COUNT = 20


class ConfidenceHistogramModule(FilterableModule[ModelContractConfig]):
    """Return a confidence histogram of the predictions."""

    @staticmethod
    def get_outcome_mask(
        ds, outcome: OutcomeName, without_postprocessing: bool = False
    ) -> List[bool]:
        return [
            utterance_outcome == outcome
            for utterance_outcome in get_outcomes_from_ds(ds, without_postprocessing)
        ]

    @classmethod
    def get_bins(
        cls, ds: Dataset, without_postprocessing: bool = False
    ) -> List[ConfidenceBinDetails]:
        """Compute the bins on the specified dataset split.

        Note: This lives outside of `compute_on_dataset_split()` so that it can be called without
        going through calling the module and filtering the dataset.

        Args:
            ds: Dataset Split on which to compute bins
            without_postprocessing: Whether to use outcomes and confidences without pipeline
                postprocessing

        Returns:
            List of the confidence bins with their confidence and the outcome count.
        """

        bins = np.linspace(0, 1, CONFIDENCE_BINS_COUNT + 1)

        if len(ds) > 0:
            # Get the bin index for each prediction.
            confidences = np.max(get_confidences_from_ds(ds, without_postprocessing), axis=1)
            bin_indices = np.minimum(
                np.floor(confidences * CONFIDENCE_BINS_COUNT),
                CONFIDENCE_BINS_COUNT - 1,  # So that 100% falls in the last bin
            )

            # Create the records. We drop the last bin as it's the maximum.
            result = []
            for bin_index, bin_min_value in enumerate(bins[:-1]):
                bin_mask = bin_indices == bin_index
                outcome_count = defaultdict(int)
                for outcome in ALL_OUTCOMES:
                    outcome_count[outcome] = np.logical_and(
                        bin_mask, cls.get_outcome_mask(ds, outcome, without_postprocessing)
                    ).sum()
                mean_conf = (
                    0 if bin_mask.sum() == 0 else np.nan_to_num(confidences[bin_mask].mean())
                )
                result.append(
                    ConfidenceBinDetails(
                        bin_index=bin_index,
                        bin_confidence=bin_min_value + bins[1] / 2,
                        mean_bin_confidence=mean_conf,
                        outcome_count=outcome_count,
                    )
                )
        else:
            # Create empty bins
            result = [
                ConfidenceBinDetails(
                    bin_index=bin_index,
                    bin_confidence=0,
                    mean_bin_confidence=0,
                    outcome_count={outcome: 0 for outcome in ALL_OUTCOMES},
                )
                for bin_index, bin_min_value in enumerate(bins[:-1])
            ]

        return result

    def compute_on_dataset_split(self) -> List[ConfidenceHistogramResponse]:  # type: ignore
        """Compute the confidence histogram with CONFIDENCE_BINS_COUNT bins on the dataset split.

        Returns:
            Confidence bins and threshold.

        """
        ds: Dataset = assert_not_none(self.get_dataset_split())

        return [
            ConfidenceHistogramResponse(
                bins=self.get_bins(ds, self.mod_options.without_postprocessing),
                confidence_threshold=self.get_threshold(),
            )
        ]


class ConfidenceBinIndexModule(DatasetResultModule[ModelContractConfig]):
    """Return confidence bin indices for the selected dataset split."""

    allowed_mod_options = DatasetResultModule.allowed_mod_options | {"threshold", "pipeline_index"}

    def compute_on_dataset_split(self) -> List[int]:  # type: ignore
        """Get the bin indices for each utterance in the dataset split.

        Returns:
            List of bin indices for all utterances.

        """
        ds = assert_not_none(self.get_dataset_split())
        postprocessed_confidences = cast(
            List[List[float]], ds[DatasetColumn.postprocessed_confidences]
        )
        bin_indices: List[int] = (
            np.floor(np.max(postprocessed_confidences, axis=1) * CONFIDENCE_BINS_COUNT)
            .astype("int")
            .tolist()
        )

        return bin_indices

    def _save_result(self, res: List[int], dm: DatasetSplitManager):  # type: ignore
        dm.add_column_to_prediction_table(
            DatasetColumn.confidence_bin_idx, res, table_key=assert_not_none(self._get_table_key())
        )
