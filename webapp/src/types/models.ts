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

export type QueryDetailsState = {
  detailsForPageItem?: number;
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

export type QueryBMAState = {
  useBma?: boolean;
};

export type QueryConfusionMatrixState = {
  normalize?: false;
  reorderClasses?: false;
};

export type QueryState = QueryClassOverlapState &
  QueryDetailsState &
  QueryFilterState &
  QueryPaginationState &
  QueryPipelineState &
  QueryPostprocessingState &
  QueryBMAState &
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

// Like Pick<Type, Keys>, but with the type of Values instead of the type of Keys.
// The checks for undefined ensure we deal properly with optional properties.
// For example,
// PickByValue<{ a: string; b?: string; c: undefined; d?: undefined }, string>
// should give
// { a: string; b?: string }
export type PickByValue<Type, Values> = {
  [Key in keyof Type as Type[Key] extends undefined
    ? never
    : Type[Key] extends Values | undefined
    ? Key
    : never]: Type[Key];
};
