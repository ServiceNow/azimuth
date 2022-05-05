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
