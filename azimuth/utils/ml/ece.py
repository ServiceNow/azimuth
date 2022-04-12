# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import List, Tuple, cast

import numpy as np

from azimuth.types.model_performance import ConfidenceBinDetails
from azimuth.types.outcomes import OutcomeName


def compute_ece_from_bins(bins: List[ConfidenceBinDetails]) -> Tuple[float, np.ndarray, np.ndarray]:
    """Compute the expected calibration error from a ConfidenceBinDetails.

    Args:
        bins: List of bins.

    Returns:
        ECE, the accuracy per bin and the mid confidence per bin.

    """
    acc_pred = np.array(
        [
            (
                r.outcome_count[OutcomeName.CorrectAndPredicted]
                + r.outcome_count[OutcomeName.CorrectAndRejected]
            )
            / max(1, sum(r.outcome_count.values()))
            for r in bins
        ]
    )
    average_confidence = np.array([r.mean_bin_confidence for r in bins])
    support = np.array([sum(r.outcome_count.values()) for r in bins])
    bin_confidence = np.array([r.bin_confidence for r in bins])

    # From baal code
    n = support.sum()
    return (
        cast(float, ((support / n) * np.abs(acc_pred - average_confidence)).sum()),
        acc_pred,
        bin_confidence,
    )
