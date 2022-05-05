# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import azimuth.modules.model_performance.outcomes
from azimuth.modules import perturbation_testing
from azimuth.modules.dataset_analysis import (
    dataset_warnings,
    similarity_analysis,
    spectral_clustering,
    syntax_tagging,
)
from azimuth.modules.model_contract_task_mapping import model_contract_task_mapping
from azimuth.modules.model_performance import (
    confidence_binning,
    confusion_matrix,
    metrics,
    outcome_count,
)
from azimuth.modules.pipeline_comparison import prediction_comparison
from azimuth.modules.utilities import validation
from azimuth.modules.word_analysis import tokens_to_words, top_words
from azimuth.types import SupportedMethod, SupportedModule

# Uses raw indices and needs access to the model.
model_contract_methods = {
    SupportedMethod.Inputs: model_contract_task_mapping,
    SupportedMethod.Predictions: model_contract_task_mapping,
    SupportedMethod.Saliency: model_contract_task_mapping,
    SupportedMethod.PostProcess: model_contract_task_mapping,
}

# Black formats this in a way where the line is too long.
# fmt: off
modules = {
    SupportedModule.ConfidenceBinIndex: confidence_binning.ConfidenceBinIndexModule,
    SupportedModule.ConfidenceHistogram: confidence_binning.ConfidenceHistogramModule,
    SupportedModule.ConfusionMatrix: confusion_matrix.ConfusionMatrixModule,
    SupportedModule.DatasetWarnings: dataset_warnings.DatasetWarningsModule,
    SupportedModule.FAISS: similarity_analysis.FAISSModule,
    SupportedModule.Metrics: metrics.MetricsModule,
    SupportedModule.MetricsPerFilter: metrics.MetricsPerFilterModule,
    SupportedModule.NeighborsTagging: similarity_analysis.NeighborsTaggingModule,
    SupportedModule.Outcome: azimuth.modules.model_performance.outcomes.OutcomesModule,
    SupportedModule.OutcomeCountPerFilter: outcome_count.OutcomeCountPerFilterModule,
    SupportedModule.OutcomeCountPerThreshold: outcome_count.OutcomeCountPerThresholdModule,
    SupportedModule.PerturbationTesting: perturbation_testing.PerturbationTestingModule,
    SupportedModule.PerturbationTestingMerged: perturbation_testing.PerturbationTestingMergedModule,
    SupportedModule.PerturbationTestingSummary:
        perturbation_testing.PerturbationTestingSummaryModule,
    SupportedModule.PredictionComparison: prediction_comparison.PredictionComparisonModule,
    SupportedModule.SpectralClustering: spectral_clustering.SpectralClusteringModule,
    SupportedModule.SyntaxTagging: syntax_tagging.SyntaxTaggingModule,
    SupportedModule.TokensToWords: tokens_to_words.TokensToWordsModule,
    SupportedModule.TopWords: top_words.TopWordsModule,
    SupportedModule.Validation: validation.ValidationModule
}
# fmt: on
