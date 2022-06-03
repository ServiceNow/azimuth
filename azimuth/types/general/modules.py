# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from enum import Enum


class SupportedTask(str, Enum):
    pass


class SupportedModelContract(SupportedTask):
    hf_text_classification = "hf_text_classification"
    file_based_text_classification = "file_based_text_classification"
    custom_text_classification = "custom_text_classification"


class SupportedMethod(SupportedTask):
    Inputs = "Inputs"
    Predictions = "Predictions"
    PostProcess = "PostProcess"
    Saliency = "Saliency"


class SupportedModule(SupportedTask):
    ConfidenceBinIndex = "ConfidenceBinIndex"
    ConfidenceHistogram = "ConfidenceHistogram"
    ConfusionMatrix = "ConfusionMatrix"
    DatasetWarnings = "DatasetWarnings"
    FAISS = "FAISS"
    Metrics = "Metrics"
    MetricsPerFilter = "MetricsPerFilter"
    NeighborsTagging = "NeighborsTagging"
    Outcome = "Outcome"
    OutcomeCountPerFilter = "OutcomeCountPerFilter"
    OutcomeCountPerThreshold = "OutcomeCountPerThreshold"
    PerturbationTesting = "PerturbationTesting"
    PerturbationTestingMerged = "PerturbationTestingMerged"
    PerturbationTestingSummary = "PerturbationTestingSummary"
    PredictionComparison = "PredictionComparison"
    SyntaxTagging = "SyntaxTagging"
    TokensToWords = "TokensToWords"
    TopWords = "TopWords"
    Validation = "Validation"
