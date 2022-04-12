# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from collections import defaultdict
from typing import List

import numpy as np
import structlog
from datasets import Dataset

from azimuth.config import ModelContractConfig
from azimuth.dataset_split_manager import DatasetSplitManager
from azimuth.modules.base_classes.aggregation_module import FilterableModule
from azimuth.modules.base_classes.indexable_module import DatasetResultModule
from azimuth.types.general.dataset import DatasetColumn
from azimuth.types.model_performance import (
    ConfidenceBinDetails,
    ConfidenceHistogramResponse,
)
from azimuth.types.outcomes import ALL_OUTCOMES, OutcomeName
from azimuth.utils.validation import assert_not_none

CONFIDENCE_BINS_COUNT = 20

log = structlog.get_logger()


class ConfidenceBinningTask:
    """Common functions to modules related to confidence bins."""

    @staticmethod
    def get_outcome_mask(ds: Dataset, outcome: OutcomeName) -> List[bool]:
        return [utterance_outcome == outcome for utterance_outcome in ds[DatasetColumn.outcome]]

    @staticmethod
    def get_confidence_interval() -> np.ndarray:
        return np.linspace(0, 1, CONFIDENCE_BINS_COUNT + 1)


class ConfidenceHistogramModule(FilterableModule[ModelContractConfig], ConfidenceBinningTask):
    """Return a confidence histogram of the predictions."""

    def compute_on_dataset_split(self) -> List[ConfidenceHistogramResponse]:  # type: ignore
        """Compute the confidence histogram with CONFIDENCE_BINS_COUNT bins on the dataset split.

        Returns:
            List of the confidence bins with their confidence and the outcome count.

        """
        bins = self.get_confidence_interval()

        ds: Dataset = assert_not_none(self.get_dataset_split())

        result = []
        if len(ds) > 0:
            # Get the bin index for each prediction.
            confidences = np.max(ds[DatasetColumn.postprocessed_confidences], axis=1)
            bin_indices = np.floor(confidences * CONFIDENCE_BINS_COUNT)

            # Create the records. We drop the last bin as it's the maximum.
            for bin_index, bin_min_value in enumerate(bins[:-1]):
                bin_mask = bin_indices == bin_index
                outcome_count = defaultdict(int)
                for outcome in ALL_OUTCOMES:
                    outcome_count[outcome] = np.logical_and(
                        bin_mask, self.get_outcome_mask(ds, outcome)
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
            for bin_index, bin_min_value in enumerate(bins[:-1]):
                result.append(
                    ConfidenceBinDetails(
                        bin_index=bin_index,
                        bin_confidence=0,
                        mean_bin_confidence=0,
                        outcome_count={outcome: 0 for outcome in ALL_OUTCOMES},
                    )
                )

        return [ConfidenceHistogramResponse(details_all_bins=result)]


class ConfidenceBinIndexModule(DatasetResultModule[ModelContractConfig], ConfidenceBinningTask):
    """Return confidence bin indices for the selected dataset split."""

    allowed_mod_options = DatasetResultModule.allowed_mod_options | {"threshold", "pipeline_index"}

    def compute_on_dataset_split(self) -> List[int]:  # type: ignore
        """Get the bin indices for each utterance in the dataset split.

        Returns:
            List of bin indices for all utterances.

        """
        self.get_confidence_interval()
        ds = assert_not_none(self.get_dataset_split())

        bin_indices: List[int] = (
            np.floor(
                np.max(ds[DatasetColumn.postprocessed_confidences], axis=1) * CONFIDENCE_BINS_COUNT
            )
            .astype("int")
            .tolist()
        )

        return bin_indices

    def _save_result(self, res: List[int], dm: DatasetSplitManager):  # type: ignore
        dm.add_column_to_prediction_table(
            DatasetColumn.confidence_bin_idx, res, table_key=assert_not_none(self._get_table_key())
        )
