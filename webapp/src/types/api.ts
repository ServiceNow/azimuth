import { components } from "types/generated/generatedTypes";

export type AzimuthConfig = components["schemas"]["AzimuthConfig"];
export type AvailableDatasetSplits =
  components["schemas"]["AvailableDatasetSplits"];
export type ClassOverlapTableClassPair =
  components["schemas"]["ClassOverlapTableClassPair"];
export type ConfidenceBinDetails =
  components["schemas"]["ConfidenceBinDetails"];
export type ConfidenceHistogramResponse =
  components["schemas"]["ConfidenceHistogramResponse"];
// CountPerFilterResponse is basically like OutcomeCountPerFilterResponse | UtteranceCountPerFilterResponse
// (which would unfortunately lose all OutcomeCountPerFilterResponse's extra fields),
// but with OutcomeCountPerFilterResponse's extra fields as optional instead.
export interface CountPerFilterResponse
  extends UtteranceCountPerFilterResponse {
  countPerFilter: Partial<
    Omit<
      OutcomeCountPerFilterResponse["countPerFilter"],
      keyof UtteranceCountPerFilterResponse["countPerFilter"]
    >
  > &
    Record<
      keyof UtteranceCountPerFilterResponse["countPerFilter"],
      CountPerFilterValue[]
    >;
}
export type CountPerFilterValue = Partial<OutcomeCountPerFilterValue> &
  UtteranceCountPerFilterValue;
export type DataAction = components["schemas"]["DataAction"];
export type DatasetDistributionComparison =
  components["schemas"]["DatasetDistributionComparison"];
export type DatasetDistributionComparisonValue =
  components["schemas"]["DatasetDistributionComparisonValue"];
export type DatasetInfoResponse = components["schemas"]["DatasetInfoResponse"];
export type DatasetSplitName = Exclude<
  components["schemas"]["DatasetSplitName"],
  "all"
>;
export type DatasetWarning = components["schemas"]["DatasetWarning"];
export type DatasetWarningGroup = components["schemas"]["DatasetWarningGroup"];
export type FormatType = components["schemas"]["FormatType"];
export type GetUtterancesResponse =
  components["schemas"]["GetUtterancesResponse"];
export type HTTPExceptionModel = components["schemas"]["HTTPExceptionModel"];
export type MetricInfo = components["schemas"]["MetricInfo"];
export type MetricsPerFilterAPIResponse =
  components["schemas"]["MetricsPerFilterAPIResponse"];
export type MetricsPerFilterValue =
  components["schemas"]["MetricsPerFilterValue"];
export type MetricsResponse = components["schemas"]["MetricsAPIResponse"];
export type Outcome = components["schemas"]["OutcomeName"];
export type OutcomeCountPerFilterResponse =
  components["schemas"]["OutcomeCountPerFilterResponse"];
export type OutcomeCountPerFilterValue =
  components["schemas"]["OutcomeCountPerFilterValue"];
export type OutcomeCountPerThreshold =
  components["schemas"]["OutcomeCountPerThresholdValue"];
export type PerturbationTestingSummary =
  components["schemas"]["PerturbationTestingSummary"];
export type PerturbationTestSummary =
  components["schemas"]["PerturbationTestSummary"];
export type PerturbedUtteranceExample =
  components["schemas"]["PerturbedUtteranceExample"];
export type PerturbedUtterance =
  components["schemas"]["PerturbedUtteranceWithClassNames"];
export type PerturbationType = components["schemas"]["PerturbationType"];
export type PipelineDefinition = components["schemas"]["PipelineDefinition"];
export type PlotSpecification = components["schemas"]["PlotSpecification"];
export type SimilarUtterance = components["schemas"]["SimilarUtterance"];
export type SimilarUtterancesResponse =
  components["schemas"]["SimilarUtterancesResponse"];
export type SmartTag = components["schemas"]["SmartTag"];
export type StatusResponse = components["schemas"]["StatusResponse"];
export type SupportedLanguage = components["schemas"]["SupportedLanguage"];
export type SupportedModelContract =
  components["schemas"]["SupportedModelContract"];
export type SupportedSpacyModels =
  components["schemas"]["SupportedSpacyModels"];
export type TopWordsResponse = components["schemas"]["TopWordsResponse"];
export type TopWordsResult = components["schemas"]["TopWordsResult"];
export type Utterance = components["schemas"]["Utterance"];
export type UtterancePatch = components["schemas"]["UtterancePatch"];
export type UtteranceCountPerFilterResponse =
  components["schemas"]["UtteranceCountPerFilterResponse"];
export type UtteranceCountPerFilterValue =
  components["schemas"]["UtteranceCountPerFilterValue"];
export type UtterancesSortableColumn =
  components["schemas"]["UtterancesSortableColumn"];
