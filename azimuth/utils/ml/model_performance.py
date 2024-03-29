# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from typing import List, TypeVar

from azimuth.types.model_performance import UtteranceCountPerFilterValue
from azimuth.types.outcomes import OutcomeName

T = TypeVar("T", bound=UtteranceCountPerFilterValue)


def sorted_by_utterance_count(
    metrics: List[T],
) -> List[T]:
    return sorted(metrics, key=lambda r: r.utterance_count, reverse=True)


def sorted_by_utterance_count_with_last(metrics: List[T], index_to_put_first: int) -> List[T]:
    """Sort list of metrics by utterance_count, then place a specific item at the beginning.

    Args:
        metrics: List of metrics to sort.
        index_to_put_first: Filter to put first in the list, usually
            REJECTION_CLASS/NO_SMART_TAGS/NO_ACTION.

    Returns:
        List of metrics sorted, but with `index_to_put_first` as first.
    """
    first = metrics.pop(index_to_put_first)
    return [first, *sorted_by_utterance_count(metrics)]


def compute_outcome(prediction: int, label: int, rejection_class_idx) -> OutcomeName:
    """Compute prediction outcome based on the prediction and label.

    Note: It was moved out of the OutcomesModule class for circular import issues.

    Args:
        prediction: Class index of the prediction
        label: Class index of the label
        rejection_class_idx: Class index of the rejection class

    Returns:
        Outcome value
    """
    rejected = prediction == rejection_class_idx
    if prediction == label:
        return OutcomeName.CorrectAndRejected if rejected else OutcomeName.CorrectAndPredicted
    else:
        return OutcomeName.IncorrectAndRejected if rejected else OutcomeName.IncorrectAndPredicted
