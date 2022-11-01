import {
  DataAction,
  Outcome,
  SmartTag,
  UtterancesSortableColumn,
} from "types/api";

export type QueryClassOverlapState = {
  selfOverlap?: true;
  scaleByClass?: false;
  overlapThreshold?: number;
};

export type QueryArrayFiltersState = {
  label?: string[];
  prediction?: string[];
  extremeLength?: SmartTag[];
  partialSyntax?: SmartTag[];
  dissimilar?: SmartTag[];
  almostCorrect?: SmartTag[];
  behavioralTesting?: SmartTag[];
  pipelineComparison?: SmartTag[];
  uncertain?: SmartTag[];
  dataAction?: DataAction[];
  outcome?: Outcome[];
};

export type QueryFilterState = QueryArrayFiltersState & {
  confidenceMin?: number;
  confidenceMax?: number;
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
  normalize?: false;
  reorderClasses?: false;
};

export type QueryState = QueryClassOverlapState &
  QueryFilterState &
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
