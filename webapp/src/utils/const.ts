import {
  AvailableFilter,
  QueryPaginationState,
  QueryPipelineState,
} from "types/models";

export const DATASET_SPLIT_NAMES = ["eval", "train"] as const;

export const DATASET_SPLIT_PRETTY_NAMES = {
  eval: "Evaluation",
  train: "Training",
} as const;

export const ID_TOOLTIP =
  "This id created by Azimuth corresponds to the row_idx column in the dataset split export";

export const PIPELINE_REQUIRED_TIP = "Unavailable without a pipeline";

export const PAGE_SIZE = 10;
export const PAGE: keyof QueryPaginationState = "page";
export const SORT: keyof QueryPaginationState = "sort";
export const DESCENDING: keyof QueryPaginationState = "descending";
export const PIPELINE_INDEX: keyof QueryPipelineState = "pipelineIndex";
export const CONFIDENCE_MAX: AvailableFilter = "confidenceMax";
export const CONFIDENCE_MIN: AvailableFilter = "confidenceMin";
export const PREDICTIONS: AvailableFilter = "predictions";
export const LABELS: AvailableFilter = "labels";
export const DATA_ACTIONS: AvailableFilter = "dataActions";
export const OUTCOMES: AvailableFilter = "outcomes";
export const SMART_TAGS: AvailableFilter = "smartTags";
export const UTTERANCE: AvailableFilter = "utterance";

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
