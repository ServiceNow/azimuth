import _ from "lodash";
import { toast } from "react-toastify";
import { CountPerFilterValue, OutcomeCountPerFilterValue } from "types/api";
import {
  QueryClassOverlapState,
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
  QueryState,
  QueryConfusionMatrixState,
  QueryDetailsState,
} from "types/models";

export const classNames = (...args: any[]) => args.filter(Boolean).join(" ");

export const raiseErrorToast = (message: string) => {
  toast.error(message);
};

export const raiseSuccessToast = (message: string) => {
  toast.success(message);
};

const camelToSnakeCase = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const convertNumber = (s: string | null) =>
  s === null ? undefined : Number(s);

const convertString = <T extends string>(s: string | null) =>
  (s as T) || undefined;

const convertStringArray = <T extends string>(s: string | null) =>
  s?.split(",") as T[] | undefined;

const convertSearchParams = <T>(
  q: URLSearchParams,
  conversions: Required<{ [Key in keyof T]: (key: string | null) => T[Key] }>
): T => _.mapValues(conversions, (c, k) => c(q.get(camelToSnakeCase(k)))) as T;

// This function is dangerous and should be memoized.
// It is still used in unit tests.
export const parseSearchString = (searchString: string) => {
  const q = new URLSearchParams(searchString);
  return {
    classOverlap: convertSearchParams<QueryClassOverlapState>(q, {
      selfOverlap: (s) => s !== null || undefined,
      scaleByClass: (s) => s === null && undefined,
      overlapThreshold: convertNumber,
    }),
    confusionMatrix: convertSearchParams<QueryConfusionMatrixState>(q, {
      normalize: (s) => s === null && undefined,
      reorderClasses: (s) => s === null && undefined,
    }),
    details: convertSearchParams<QueryDetailsState>(q, {
      detailsForPageItem: convertNumber,
    }),
    filters: convertSearchParams<QueryFilterState>(q, {
      confidenceMin: convertNumber,
      confidenceMax: convertNumber,
      label: convertStringArray,
      prediction: convertStringArray,
      extremeLength: convertStringArray,
      partialSyntax: convertStringArray,
      dissimilar: convertStringArray,
      almostCorrect: convertStringArray,
      behavioralTesting: convertStringArray,
      pipelineComparison: convertStringArray,
      uncertain: convertStringArray,
      dataAction: convertStringArray,
      outcome: convertStringArray,
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
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined || (Array.isArray(value) && value.length === 0)
        ? []
        : [`${camelToSnakeCase(key)}=${value}`]
    )
  );

export const constructApiSearchString = (query: object): string =>
  joinSearchString(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined
        ? []
        : [value].flat().map((v) => `${camelToSnakeCase(key)}=${v}`)
    )
  );

export const isPipelineSelected = (
  pipeline: QueryPipelineState
): pipeline is Required<QueryPipelineState> => {
  return pipeline.pipelineIndex !== undefined;
};

export const isOutcomeCountPerFilterValue = (
  countPerFilterValue: CountPerFilterValue
): countPerFilterValue is OutcomeCountPerFilterValue =>
  Boolean(countPerFilterValue.outcomeCount);
