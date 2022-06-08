# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, List, Optional, Tuple

from pydantic import Field

from azimuth.types import AliasModel, Array, ModuleResponse, PlotSpecification
from azimuth.types.outcomes import OutcomeName


class MetricsResponseCommonFields(ModuleResponse):
    outcome_count: Dict[OutcomeName, int] = Field(..., title="Outcome Count")
    utterance_count: int = Field(..., title="Total number of utterances")
    custom_metrics: Dict[str, float] = Field(..., title="Custom Metrics")
    ece: float = Field(..., title="ECE")


class MetricsAPIResponse(MetricsResponseCommonFields):
    ece_plot: Optional[PlotSpecification] = Field(..., title="ECE Plot", nullable=True)


class MetricsModuleResponse(MetricsResponseCommonFields):
    ece_plot_args: Optional[Tuple]


class UtteranceCountPerFilterValue(AliasModel):
    utterance_count: int = Field(..., title="Total number of utterances for the filter")
    filter_value: str = Field(..., title="Filter value")


class UtteranceCountPerFilter(AliasModel):
    prediction: Optional[List[UtteranceCountPerFilterValue]] = Field(
        ..., title="Prediction", nullable=True
    )
    label: List[UtteranceCountPerFilterValue] = Field(..., title="Label")
    smart_tag: List[UtteranceCountPerFilterValue] = Field(..., title="Smart tag")
    data_action: List[UtteranceCountPerFilterValue] = Field(..., title="Data action tag")
    outcome: Optional[List[UtteranceCountPerFilterValue]] = Field(
        ..., title="Outcome", nullable=True
    )


class UtteranceCountPerFilterResponse(AliasModel):
    count_per_filter: UtteranceCountPerFilter = Field(..., title="Rubrics per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class OutcomeCountPerFilterValue(UtteranceCountPerFilterValue):
    outcome_count: Dict[OutcomeName, int] = Field(..., title="Prediction count per outcome")


class OutcomeCountPerFilter(AliasModel):
    prediction: List[OutcomeCountPerFilterValue] = Field(..., title="Prediction")
    label: List[OutcomeCountPerFilterValue] = Field(..., title="Label")
    smart_tag: List[OutcomeCountPerFilterValue] = Field(..., title="Smart tag")
    data_action: List[OutcomeCountPerFilterValue] = Field(..., title="Data action tag")
    outcome: List[OutcomeCountPerFilterValue] = Field(..., title="Outcome")


class OutcomeCountPerFilterResponse(ModuleResponse):
    count_per_filter: OutcomeCountPerFilter = Field(..., title="Outcome count per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class MetricsPerFilterValue(MetricsResponseCommonFields, UtteranceCountPerFilterValue):
    pass


class MetricsPerFilter(AliasModel):
    prediction: List[MetricsPerFilterValue] = Field(..., title="Prediction")
    label: List[MetricsPerFilterValue] = Field(..., title="Label")
    smart_tag: List[MetricsPerFilterValue] = Field(..., title="Smart tag")
    data_action: List[MetricsPerFilterValue] = Field(..., title="Data action tag")
    outcome: List[MetricsPerFilterValue] = Field(..., title="Outcome")


class MetricsPerFilterModuleResponse(ModuleResponse):
    metrics_per_filter: MetricsPerFilter = Field(..., title="Metrics per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class MetricsPerFilterAPIResponse(MetricsPerFilterModuleResponse):
    metrics_overall: List[MetricsPerFilterValue] = Field(..., title="Metrics overall")


class ConfusionMatrixResponse(ModuleResponse):
    confusion_matrix: Array[float] = Field(..., title="Confusion Matrix normalized")
    normalized: bool = Field(..., title="Normalized state of Confusion Matrix")


class ConfidenceBinDetails(AliasModel):
    bin_index: int = Field(..., title="Bin index")
    bin_confidence: float = Field(..., title="Bin confidence")
    mean_bin_confidence: float = Field(..., title="Bin mean confidence")
    outcome_count: Dict[OutcomeName, int] = Field(..., title="Outcome count")


class ConfidenceHistogramResponse(ModuleResponse):
    details_all_bins: List[ConfidenceBinDetails] = Field(..., title="Details for all bins")


class OutcomeCountPerThresholdValue(AliasModel):
    threshold: float
    outcome_count: Dict[OutcomeName, int] = Field(..., title="Prediction count per outcome")


class OutcomeCountPerThresholdResponse(ModuleResponse):
    outcome_count_all_thresholds: List[OutcomeCountPerThresholdValue] = Field(
        ..., title="Outcome count for all thresholds"
    )
