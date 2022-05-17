export const DATASET_SPLIT_NAMES = ["eval", "train"] as const;

export const DATASET_SPLIT_PRETTY_NAMES = {
  eval: "Evaluation",
  train: "Training",
} as const;

export const ID_TOOLTIP =
  "This id created by Azimuth corresponds to the row_idx column in the dataset split export";

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
