# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from enum import Enum


class DatasetSplitName(str, Enum):
    eval = "eval"
    train = "train"
    all = "all"


class DatasetColumn(str, Enum):
    row_idx = "row_idx"
    idx = "idx"
    model_predictions = "model_predictions"
    postprocessed_prediction = "postprocessed_prediction"
    model_confidences = "model_confidences"
    postprocessed_confidences = "postprocessed_confidences"
    confidence_bin_idx = "confidence_bin_idx"
    model_outcome = "model_outcome"
    postprocessed_outcome = "postprocessed_outcome"
    token_count = "token_count"
    neighbors_train = f"neighbors_{DatasetSplitName.train}"
    neighbors_eval = f"neighbors_{DatasetSplitName.eval}"
    overlapped_classes = "overlapped_classes"
