# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from azimuth.types.model_performance import ConfidenceBinDetails
from azimuth.types.outcomes import OutcomeName
from azimuth.utils.ml.ece import compute_ece_from_bins


def test_ece():
    # perfect case
    bins = [
        ConfidenceBinDetails(
            bin_index=18,
            bin_confidence=0.95,
            mean_bin_confidence=0.94,
            outcome_count={
                OutcomeName.IncorrectAndPredicted: 5,
                OutcomeName.IncorrectAndRejected: 1,
                OutcomeName.CorrectAndPredicted: 90,
                OutcomeName.CorrectAndRejected: 5,
            },
        ),
        ConfidenceBinDetails(
            bin_index=19,
            bin_confidence=0.975,
            mean_bin_confidence=0.978,
            outcome_count={
                OutcomeName.IncorrectAndPredicted: 2,
                OutcomeName.IncorrectAndRejected: 1,
                OutcomeName.CorrectAndPredicted: 95,
                OutcomeName.CorrectAndRejected: 2,
            },
        ),
    ]
    ece = compute_ece_from_bins(bins)[0]
    assert ece < 0.01

    # far from perfect case
    bins = [
        ConfidenceBinDetails(
            bin_index=18,
            bin_confidence=0.95,
            mean_bin_confidence=0.94,
            outcome_count={
                OutcomeName.IncorrectAndPredicted: 10,
                OutcomeName.IncorrectAndRejected: 10,
                OutcomeName.CorrectAndPredicted: 75,
                OutcomeName.CorrectAndRejected: 5,
            },
        ),
        ConfidenceBinDetails(
            bin_index=19,
            bin_confidence=0.975,
            mean_bin_confidence=0.978,
            outcome_count={
                OutcomeName.IncorrectAndPredicted: 10,
                OutcomeName.IncorrectAndRejected: 10,
                OutcomeName.CorrectAndPredicted: 75,
                OutcomeName.CorrectAndRejected: 5,
            },
        ),
    ]
    ece = compute_ece_from_bins(bins)[0]
    assert 0.1 < ece < 0.2
