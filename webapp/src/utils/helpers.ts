import { toast } from "react-toastify";
import {
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryState,
} from "types/models";
import {
  PAGE,
  SORT,
  DESCENDING,
  PREDICTIONS,
  LABELS,
  SMART_TAGS,
  DATA_ACTIONS,
  CONFIDENCE_MIN,
  CONFIDENCE_MAX,
  OUTCOMES,
  UTTERANCE,
  PIPELINE_INDEX,
} from "utils/const";
import {
  DataAction,
  Outcome,
  SmartTag,
  UtterancesSortableColumn,
} from "types/api";

export const classNames = (...args: any[]) => args.filter(Boolean).join(" ");

export const raiseErrorToast = (message: string) => {
  toast.error(message);
};

export const raiseSuccessToast = (message: string) => {
  toast.success(message);
};

const str2num = (s: string | null) => (s === null ? undefined : Number(s));

// This function is dangerous and should be memoized.
// It is still used in unit tests.
export const convertSearchParamsToFilterState = (
  q: URLSearchParams
): QueryFilterState => ({
  confidenceMin: str2num(q.get(CONFIDENCE_MIN)),
  confidenceMax: str2num(q.get(CONFIDENCE_MAX)),
  labels: q.get(LABELS)?.split(","),
  predictions: q.get(PREDICTIONS)?.split(","),
  smartTags: q.get(SMART_TAGS)?.split(",") as SmartTag[] | undefined,
  dataActions: q.get(DATA_ACTIONS)?.split(",") as DataAction[] | undefined,
  outcomes: q.get(OUTCOMES)?.split(",") as Outcome[] | undefined,
  utterance: q.get(UTTERANCE) || undefined,
});

export const convertSearchParamsToPaginationState = (
  q: URLSearchParams
): QueryPaginationState => ({
  page: str2num(q.get(PAGE)) || 1,
  sort: (q.get(SORT) || undefined) as UtterancesSortableColumn | undefined,
  descending: q.get(DESCENDING) !== null || undefined,
});

export const convertSearchParamsToPipelineState = (
  q: URLSearchParams
): QueryPipelineState => ({
  pipelineIndex: str2num(q.get(PIPELINE_INDEX)),
});

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
