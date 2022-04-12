from enum import Enum


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
