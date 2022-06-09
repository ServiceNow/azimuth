# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from typing import Dict, Generic, List, Optional, Tuple, TypeVar

from pydantic import Field
from pydantic.generics import GenericModel

from azimuth.types import AliasModel, Array, ModuleResponse, PlotSpecification
from azimuth.types.outcomes import OutcomeName

T = TypeVar("T")


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


class ValuePerDatasetSmartTag(AliasModel, GenericModel, Generic[T]):
    extreme_length: List[T] = Field(..., title="Extreme length")
    partial_syntax: List[T] = Field(..., title="Partial syntax")


class ValuePerPipelineSmartTag(AliasModel, GenericModel, Generic[T]):
    dissimilar: List[T] = Field(..., title="Dissimilar smart tag")
    almost_correct: List[T] = Field(..., title="Almost correct smart tag")
    behavioral_testing: List[T] = Field(..., title="Behavioral testing smart tag")
    uncertain: List[T] = Field(..., title="Uncertain smart tag")


class ValuePerDatasetFilter(ValuePerDatasetSmartTag[T], GenericModel, Generic[T]):
    label: List[T] = Field(..., title="Label")
    data_action: List[T] = Field(..., title="Data action tag")


class ValuePerPipelineFilter(ValuePerPipelineSmartTag[T], GenericModel, Generic[T]):
    prediction: List[T] = Field(..., title="Prediction")
    outcome: List[T] = Field(..., title="Outcome")


class UtteranceCountPerFilter(ValuePerDatasetFilter[UtteranceCountPerFilterValue]):
    pass


class UtteranceCountPerFilterResponse(AliasModel):
    count_per_filter: UtteranceCountPerFilter = Field(..., title="Rubrics per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class OutcomeCountPerFilterValue(UtteranceCountPerFilterValue):
    outcome_count: Dict[OutcomeName, int] = Field(..., title="Prediction count per outcome")


class OutcomeCountPerFilter(
    ValuePerDatasetFilter[OutcomeCountPerFilterValue],
    ValuePerPipelineFilter[OutcomeCountPerFilterValue],
):
    pass


class OutcomeCountPerFilterResponse(ModuleResponse):
    count_per_filter: OutcomeCountPerFilter = Field(..., title="Outcome count per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class MetricsPerFilterValue(MetricsResponseCommonFields, UtteranceCountPerFilterValue):
    pass


class MetricsPerFilter(
    ValuePerDatasetFilter[MetricsPerFilterValue], ValuePerPipelineFilter[MetricsPerFilterValue]
):
    pass


class MetricsPerFilterModuleResponse(ModuleResponse):
    metrics_per_filter: MetricsPerFilter = Field(..., title="Metrics per filter")
    utterance_count: int = Field(..., title="Total number of utterances")


class MetricsPerFilterAPIResponse(MetricsPerFilterModuleResponse):
    metrics_overall: List[MetricsPerFilterValue] = Field(..., title="Metrics overall")


class ConfusionMatrixResponse(ModuleResponse):
    confusion_matrix: Array[float] = Field(..., title="Confusion Matrix normalized")


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
