import {
  DataAction,
  Outcome,
  SmartTag,
  UtterancesSortableColumn,
} from "types/api";

export type ApiCallState = "init" | "fetching" | "error" | "done";

export type QueryFilterState = {
  confidenceMin?: number;
  confidenceMax?: number;
  labels?: string[];
  predictions?: string[];
  smartTags?: SmartTag[];
  dataActions?: DataAction[];
  outcomes?: Outcome[];
  utterance?: string;
};

export type QueryPaginationState = {
  page?: number;
  sort?: UtterancesSortableColumn;
  descending?: true;
};

export type QueryPipelineState = {
  pipelineIndex?: number;
};

export type QueryPostprocessingState = {
  withoutPostprocessing?: true;
};

export type QueryConfusionMatrixState = {
  normalized?: false;
};

export type QueryState = QueryFilterState &
  QueryPaginationState &
  QueryPipelineState &
  QueryPostprocessingState &
  QueryConfusionMatrixState;

export type Tags = { [Tag: string]: boolean };

export type WordCount = {
  word: string;
  count: number;
};

export type Bin = {
  name: number;
  type: Outcome;
};
