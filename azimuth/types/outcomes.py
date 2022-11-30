# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
from enum import Enum

from azimuth.types import AliasModel


class OutcomeName(str, Enum):
    CorrectAndPredicted = "CorrectAndPredicted"
    CorrectAndRejected = "CorrectAndRejected"
    IncorrectAndPredicted = "IncorrectAndPredicted"
    IncorrectAndRejected = "IncorrectAndRejected"


ALL_OUTCOMES = [
    OutcomeName.CorrectAndPredicted,
    OutcomeName.CorrectAndRejected,
    OutcomeName.IncorrectAndPredicted,
    OutcomeName.IncorrectAndRejected,
]


class OutcomeResponse(AliasModel):
    model_outcome: OutcomeName
    postprocessed_outcome: OutcomeName
