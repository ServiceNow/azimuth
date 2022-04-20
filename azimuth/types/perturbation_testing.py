# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from enum import Enum
from typing import List, Optional

from pydantic import Field

from azimuth.types import AliasModel, ModuleResponse


class PerturbationTestType(str, Enum):
    # From the Checklist paper, what type of test is it.
    invariant = "invariant"
    directional = "directional"
    mft = "mft"


class PerturbationTestFamily(str, Enum):
    fuzzy_matching = "Fuzzy Matching"
    punctuation = "Punctuation"


class PerturbationTestClass(str, Enum):
    # From the CheckList paper, what is the class of this test.
    vocabulary = "vocabulary"
    robustness = "robustness"
    temporal = "temporal"
    fairness = "fairness"
    negation = "negation"


class PerturbationTestName(str, Enum):
    neutral_token = "Neutral Token"
    question_mark = "Question Mark"
    ending_period = "Ending Period"
    inner_comma = "Inner Comma"
    inner_period = "Inner Period"
    typos = "Typos"
    contractions = "Contractions"


class PerturbationType(str, Enum):
    PreInsertion = "PreInsertion"
    PostInsertion = "PostInsertion"
    Deletion = "Deletion"
    Insertion = "Insertion"
    Replacement = "Replacement"
    Swap = "Swap"
    Expansion = "Expansion"
    Contraction = "Contraction"


PRETTY_PERTURBATION_TYPES = {
    PerturbationType.Deletion: "Delete",
    PerturbationType.Insertion: "Insert",
    PerturbationType.PostInsertion: "Append",
    PerturbationType.PreInsertion: "Prepend",
    PerturbationType.Replacement: "Replace",
    PerturbationType.Swap: "Swap",
    PerturbationType.Contraction: "Contract",
    PerturbationType.Expansion: "Expand",
}


class PerturbationTestFailureReason(str, Enum):
    PredClass = "Different predicted class."
    PredConfThreshold = "Confidence too far from original."
    NA = "NA"


class PerturbedUtteranceDetails(AliasModel):
    perturbed_utterance: str
    perturbation_type: PerturbationType
    perturbations: List[str]


class PerturbedUtteranceExample(AliasModel):
    utterance: str
    perturbed_utterance: str


class PerturbationTestSummary(AliasModel):
    name: PerturbationTestName
    description: str
    family: PerturbationTestFamily
    perturbation_type: PerturbationType
    eval_failure_rate: float
    eval_count: int
    eval_failed_count: int
    eval_confidence_delta: float
    train_failure_rate: float
    train_count: int
    train_failed_count: int
    train_confidence_delta: float
    example: PerturbedUtteranceExample


class PerturbationTestingSummaryResponse(ModuleResponse):
    all_tests_summary: List[PerturbationTestSummary]


class PerturbationTestingMergedResponse(ModuleResponse):
    eval_failure_rate: float
    train_failure_rate: float


class PerturbedUtteranceAbstract(AliasModel):
    name: PerturbationTestName
    description: str
    family: PerturbationTestFamily
    perturbed_utterance: str
    perturbations: List[str]
    perturbation_type: PerturbationType
    confidence: float
    confidence_delta: Optional[float] = Field(..., nullable=True)
    failed: bool
    failure_reason: PerturbationTestFailureReason


class PerturbedUtteranceResult(PerturbedUtteranceAbstract):
    prediction: int


class PerturbedUtteranceWithClassNames(PerturbedUtteranceAbstract):
    prediction: str


class PerturbedUtteranceDetailedResult(PerturbedUtteranceAbstract):
    prediction: str
    original_prediction: str
    original_confidence: float
    label: str
    original_utterance: str
