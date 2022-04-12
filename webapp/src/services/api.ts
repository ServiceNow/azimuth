import { QueryReturnValue } from "@reduxjs/toolkit/dist/query/baseQueryTypes";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  AzimuthConfig,
  ConfusionMatrixOperation,
  DataAction,
  DataActionResponse,
} from "types/api";
import { Tags } from "types/models";
import { GetUtterancesQueryState, fetchApi, TypedResponse } from "utils/api";
import { DATA_ACTION_NONE_VALUE } from "utils/const";
import { raiseSuccessToast } from "utils/helpers";

const responseToData =
  <P, T>(
    responsePromise: (arg: P) => Promise<TypedResponse<T>>,
    message: string
  ) =>
  async (arg: P): Promise<QueryReturnValue<T, { message: string }>> => {
    try {
      const response = await responsePromise(arg);
      return { data: await response.json() };
    } catch {
      return { error: { message } };
    }
  };

const getDataActions = (
  ids: number[],
  newValue: DataAction,
  allDataActions: string[]
) => {
  const newTagsMap: { [id: number]: Tags } = {};
  ids.forEach((id) => {
    const allFalse = allDataActions.reduce(
      (tags: Record<string, boolean>, tag) => ({
        ...tags,
        [tag]: false,
      }),
      {}
    );
    const newTags: Tags =
      newValue === DATA_ACTION_NONE_VALUE
        ? allFalse
        : { ...allFalse, [newValue]: true };
    newTagsMap[id] = newTags;
  });

  return newTagsMap;
};

const tagTypes = [
  "DatasetInfo",
  "ConfidenceHistogram",
  "Config",
  "Metrics",
  "OutcomeCountPerThreshold",
  "OutcomeCountPerFilter",
  "UtteranceCountPerFilter",
  "MetricsPerFilter",
  "MetricInfo",
  "DatasetWarnings",
  "Utterances",
  "TopWords",
  "PerturbationTestingSummary",
  "PerturbedUtterances",
  "SimilarUtterances",
  "Status",
  "ConfusionMatrix",
] as const;

type Tag = typeof tagTypes[number];

export const api = createApi({
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes,
  endpoints: (build) => ({
    getDatasetInfo: build.query({
      providesTags: () => [{ type: "DatasetInfo" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_info",
          method: "get",
        }),
        "Something went wrong fetching dataset info"
      ),
    }),
    getConfidenceHistogram: build.query({
      providesTags: () => [{ type: "ConfidenceHistogram" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/confidence_histogram",
          method: "get",
        }),
        "Something went wrong fetching confidence histogram"
      ),
    }),
    getMetrics: build.query({
      providesTags: () => [{ type: "Metrics" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/metrics",
          method: "get",
        }),
        "Something went wrong fetching metrics"
      ),
    }),
    getMetricsPerFilter: build.query({
      providesTags: () => [{ type: "MetricsPerFilter" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/metrics/per_filter",
          method: "get",
        }),
        "Something went wrong fetching metrics per filter"
      ),
    }),
    getCustomMetricInfo: build.query({
      providesTags: () => [{ type: "MetricInfo" }],
      queryFn: responseToData(
        fetchApi({
          path: "/custom_metrics_info",
          method: "get",
        }),
        "Something went wrong fetching custom metrics info"
      ),
    }),
    getOutcomeCountPerThreshold: build.query({
      providesTags: () => [{ type: "OutcomeCountPerThreshold" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/outcome_count/per_threshold",
          method: "get",
        }),
        "Something went wrong fetching outcome count for multiple thresholds"
      ),
    }),
    getOutcomeCountPerFilter: build.query({
      providesTags: () => [{ type: "OutcomeCountPerFilter" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/outcome_count/per_filter",
          method: "get",
        }),
        "Something went wrong fetching outcome count per filter"
      ),
    }),
    getUtteranceCountPerFilter: build.query({
      providesTags: () => [{ type: "UtteranceCountPerFilter" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/utterance_count/per_filter",
          method: "get",
        }),
        "Something went wrong fetching utterance count per filter"
      ),
    }),
    getDatasetWarnings: build.query({
      providesTags: () => [{ type: "DatasetWarnings" }],
      queryFn: responseToData(
        fetchApi({ path: "/dataset_warnings", method: "get" }),
        "Something went wrong fetching dataset class distribution analysis"
      ),
    }),
    getUtterances: build.query({
      providesTags: () => [{ type: "Utterances" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/utterances",
          method: "get",
        }),
        "Something went wrong fetching utterances"
      ),
    }),
    getPerturbationTestingSummary: build.query({
      providesTags: () => [{ type: "PerturbationTestingSummary" }],
      queryFn: responseToData(
        fetchApi({
          path: "/perturbation_testing_summary",
          method: "get",
        }),
        "Something went wrong fetching behavioral testing summary"
      ),
    }),
    getPerturbedUtterances: build.query({
      providesTags: () => [{ type: "PerturbedUtterances" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/utterances/{index}/perturbed_utterances",
          method: "get",
        }),
        "Something went wrong fetching perturbed utterances"
      ),
    }),
    getSimilarUtterances: build.query({
      providesTags: () => [{ type: "SimilarUtterances" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/utterances/{index}/similar_utterances",
          method: "get",
        }),
        "Something went wrong fetching similar utterances"
      ),
    }),
    updateDataActions: build.mutation<
      DataActionResponse,
      {
        ids: number[];
        newValue: DataAction;
        allDataActions: string[];
      } & GetUtterancesQueryState
    >({
      queryFn: async ({
        jobId,
        datasetSplitName,
        ids,
        newValue,
        allDataActions,
      }) =>
        responseToData(
          fetchApi({ path: "/tags", method: "post" }),
          "Something went wrong updating the resolution"
        )({
          jobId,
          body: {
            datasetSplitName,
            dataActions: getDataActions(ids, newValue, allDataActions),
          },
        }),
      invalidatesTags: () => ["OutcomeCountPerFilter", "Utterances"],
      async onQueryStarted(
        { ids, newValue, allDataActions, ...args },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          api.util.updateQueryData("getUtterances", args, (draft) => {
            draft.utterances.forEach((utterance) => {
              if (ids.includes(utterance.index)) {
                utterance.dataAction = newValue;
              }
            });
          })
        );
        try {
          await queryFulfilled;
          raiseSuccessToast("Proposed action saved to dataset");
        } catch {
          patchResult.undo();
        }
      },
    }),
    getTopWords: build.query({
      providesTags: () => [{ type: "TopWords" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/top_words",
          method: "get",
        }),
        "Something went wrong fetching top words."
      ),
    }),
    getConfusionMatrix: build.query({
      providesTags: () => [{ type: "ConfusionMatrix" }],
      queryFn: responseToData(
        fetchApi<
          "/dataset_splits/{dataset_split_name}/confusion_matrix",
          "get",
          ConfusionMatrixOperation
        >({
          path: "/dataset_splits/{dataset_split_name}/confusion_matrix",
          method: "get",
        }),
        "Something went wrong fetching the confusion matrix"
      ),
    }),
    getConfig: build.query({
      providesTags: [{ type: "Config" }],
      queryFn: responseToData(
        fetchApi({ path: "/admin/config", method: "get" }),
        "Something went wrong fetching config"
      ),
    }),
    updateConfig: build.mutation<
      AzimuthConfig,
      { jobId: string; body: Partial<AzimuthConfig> }
    >({
      queryFn: responseToData(
        fetchApi({ path: "/admin/config", method: "patch" }),
        "Something went wrong updating config"
      ),
      invalidatesTags: (...[, , { body: partialConfig }]) => {
        const tags = new Set<Tag>();
        // Invalidate DatasetInfo only after the query is fulfilled,
        // otherwise the response is not up to date or even fails.
        if ("perturbation_testing" in partialConfig) {
          tags.add("Status");
          tags.add("PerturbationTestingSummary");
          tags.add("PerturbedUtterances");
        }
        if ("similarity" in partialConfig) {
          tags.add("Status");
          tags.add("SimilarUtterances");
        }
        return [...tags];
      },
      async onQueryStarted(
        { jobId, body: partialConfig },
        { dispatch, queryFulfilled }
      ) {
        const patchConfig = dispatch(
          api.util.updateQueryData("getConfig", { jobId }, (draft) => {
            Object.assign(draft, partialConfig);
          })
        );
        const patchDatasetInfo = dispatch(
          api.util.updateQueryData("getDatasetInfo", { jobId }, (draft) => {
            if ("perturbation_testing" in partialConfig) {
              draft.perturbationTestingAvailable = Boolean(
                partialConfig.perturbation_testing
              );
            }
            if ("similarity" in partialConfig) {
              draft.similarityAvailable = Boolean(partialConfig.similarity);
            }
          })
        );
        try {
          const { data } = await queryFulfilled;
          raiseSuccessToast("Updated config");
          // The config and datasetInfo should already be fine, but the
          // following could make a difference for user A if, in this order
          // 1. User A fetches the config
          // 2. User B changes the config
          // 3. User A changes another field of the config
          // Then user A receives the changes applied by user B.
          dispatch(
            api.util.updateQueryData("getConfig", { jobId }, (draft) => {
              Object.assign(draft, data);
            })
          );
          dispatch(api.util.invalidateTags(["DatasetInfo"]));
        } catch {
          patchConfig.undo();
          patchDatasetInfo.undo();
        }
      },
    }),
    getStatus: build.query({
      providesTags: () => [{ type: "Status" }],
      queryFn: responseToData(
        fetchApi({ path: "/status", method: "get" }),
        "Something went wrong fetching the status"
      ),
    }),
  }),
});

export const {
  getConfidenceHistogram: getConfidenceHistogramEndpoint,
  getConfig: getConfigEndpoint,
  getConfusionMatrix: getConfusionMatrixEndpoint,
  getDatasetInfo: getDatasetInfoEndpoint,
  getDatasetWarnings: getDatasetWarningsEndpoint,
  getMetrics: getMetricsEndpoint,
  getMetricsPerFilter: getMetricsPerFilterEndpoint,
  getCustomMetricInfo: getCustomMetricInfoEndpoint,
  getOutcomeCountPerThreshold: getOutcomeCountPerThresholdEndpoint,
  getOutcomeCountPerFilter: getOutcomeCountPerFilterEndpoint,
  getUtteranceCountPerFilter: getUtteranceCountPerFilterEndpoint,
  getPerturbationTestingSummary: getPerturbationTestingSummaryEndpoint,
  getPerturbedUtterances: getPerturbedUtterancesEndpoint,
  getSimilarUtterances: getSimilarUtterancesEndpoint,
  getStatus: getStatusEndpoint,
  getTopWords: getTopWordsEndpoint,
  getUtterances: getUtterancesEndpoint,
  updateConfig: updateConfigEndpoint,
  updateDataActions: updateDataActionsEndpoint,
} = api.endpoints;
