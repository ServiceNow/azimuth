import {
  AlmostCorrect,
  BehavioralTesting,
  Dissimilar,
  ExtremeLength,
  PartialSyntax,
  PipelineComparison,
  Uncertain,
} from "components/Icons/SmartTagFamily";

export const DATASET_SPLIT_NAMES = ["eval", "train"] as const;

export const DATASET_SPLIT_PRETTY_NAMES = {
  eval: "Evaluation",
  train: "Training",
} as const;

export const ID_TOOLTIP =
  "This id created by Azimuth corresponds to the row_idx column in the dataset split export";

export const ECE_TOOLTIP = `
The ECE measures the calibration of the model, meaning if the confidence of the model matches its accuracy.
The lower the better. An ECE of 0 means perfect calibration.
`;

export const PIPELINE_REQUIRED_TIP = "Unavailable without a pipeline";

export const PAGE_SIZE = 10;

export const DATA_ACTION_NONE_VALUE = "NO_ACTION";

export const ALL_OUTCOMES = [
  "CorrectAndPredicted",
  "CorrectAndRejected",
  "IncorrectAndRejected",
  "IncorrectAndPredicted",
] as const;

export const OUTCOME_COLOR = {
  CorrectAndPredicted: "success",
  CorrectAndRejected: "info",
  IncorrectAndRejected: "warning",
  IncorrectAndPredicted: "error",
} as const;

export const OUTCOME_PRETTY_NAMES = {
  CorrectAndPredicted: "Correct & Predicted",
  CorrectAndRejected: "Correct & Rejected",
  IncorrectAndRejected: "Incorrect & Rejected",
  IncorrectAndPredicted: "Incorrect & Predicted",
} as const;

export const PREDICTION_CONFIDENCE_FAILURE_REASON =
  "Confidence too far from original.";

// The families of smart tags that don't require a pipeline
export const DATASET_SMART_TAG_FAMILIES = [
  "extremeLength",
  "partialSyntax",
  "dissimilar",
] as const;

export const SMART_TAG_FAMILIES = [
  ...DATASET_SMART_TAG_FAMILIES,
  "almostCorrect",
  "behavioralTesting",
  "pipelineComparison",
  "uncertain",
] as const;

export const SMART_TAG_FAMILY_ICONS = {
  extremeLength: ExtremeLength,
  partialSyntax: PartialSyntax,
  dissimilar: Dissimilar,
  almostCorrect: AlmostCorrect,
  behavioralTesting: BehavioralTesting,
  pipelineComparison: PipelineComparison,
  uncertain: Uncertain,
} as const;

export const SMART_TAG_FAMILY_PRETTY_NAMES = {
  extremeLength: "Extreme Length",
  partialSyntax: "Partial Syntax",
  dissimilar: "Dissimilar",
  almostCorrect: "Almost Correct",
  behavioralTesting: "Behavioral Testing",
  pipelineComparison: "Pipeline Comparison",
  uncertain: "Uncertain",
} as const;
