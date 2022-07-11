import _ from "lodash";
import { toast } from "react-toastify";
import {
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
  QueryState,
  QueryConfusionMatrixState,
} from "types/models";

export const classNames = (...args: any[]) => args.filter(Boolean).join(" ");

export const raiseErrorToast = (message: string) => {
  toast.error(message);
};

export const raiseSuccessToast = (message: string) => {
  toast.success(message);
};

const convertNumber = (s: string | null) =>
  s === null ? undefined : Number(s);

const convertString = <T extends string>(s: string | null) =>
  (s as T) || undefined;

const convertStringArray = <T extends string>(s: string | null) =>
  s?.split(",") as T[] | undefined;

const convertSearchParams = <T>(
  q: URLSearchParams,
  conversions: Required<{ [Key in keyof T]: (key: string | null) => T[Key] }>
): T => _.mapValues(conversions, (convert, name) => convert(q.get(name))) as T;

// This function is dangerous and should be memoized.
// It is still used in unit tests.
export const parseSearchString = (searchString: string) => {
  const q = new URLSearchParams(searchString);
  return {
    confusionMatrix: convertSearchParams<QueryConfusionMatrixState>(q, {
      normalized: (s) => s === null && undefined,
    }),
    filters: convertSearchParams<QueryFilterState>(q, {
      confidenceMin: convertNumber,
      confidenceMax: convertNumber,
      labels: convertStringArray,
      predictions: convertStringArray,
      extremeLength: convertStringArray,
      partialSyntax: convertStringArray,
      dissimilar: convertStringArray,
      almostCorrect: convertStringArray,
      behavioralTesting: convertStringArray,
      pipelineComparison: convertStringArray,
      uncertain: convertStringArray,
      dataActions: convertStringArray,
      outcomes: convertStringArray,
      utterance: convertString,
    }),
    pagination: convertSearchParams<QueryPaginationState>(q, {
      page: convertNumber,
      sort: convertString,
      descending: (s) => s !== null || undefined,
    }),
    pipeline: convertSearchParams<QueryPipelineState>(q, {
      pipelineIndex: convertNumber,
    }),
    postprocessing: convertSearchParams<QueryPostprocessingState>(q, {
      withoutPostprocessing: (s) => s !== null || undefined,
    }),
  };
};

const joinSearchString = (q: string[]) => (q.length ? `?${q.join("&")}` : "");

export const constructSearchString = (query: Partial<QueryState>): string =>
  joinSearchString(
    Object.entries(query).flatMap(([filter, value]) =>
      value === undefined || (Array.isArray(value) && value.length === 0)
        ? []
        : [`${filter}=${value}`]
    )
  );

export const constructApiSearchString = (query: object): string =>
  joinSearchString(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined
        ? []
        : (Array.isArray(value) ? value : [value]).map((v) => `${key}=${v}`)
    )
  );

export const isPipelineSelected = (
  pipeline: QueryPipelineState
): pipeline is Required<QueryPipelineState> => {
  return pipeline.pipelineIndex !== undefined;
};
