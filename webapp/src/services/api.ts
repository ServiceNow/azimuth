import { QueryReturnValue } from "@reduxjs/toolkit/dist/query/baseQueryTypes";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { AzimuthConfig, UtterancePatch } from "types/api";
import {
  fetchApi,
  GetUtterancesQueryState,
  PatchUtterancesQueryState,
  TypedResponse,
} from "utils/api";
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
    } catch (error) {
      return { error: { message: `${message}\n${(error as Error).message}` } };
    }
  };

const tagTypes = [
  "DatasetInfo",
  "ConfidenceHistogram",
  "Config",
  "DefaultConfig",
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
  "ClassOverlapPlot",
  "ClassOverlap",
] as const;

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
        "Something went wrong fetching dataset warnings"
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
    getClassOverlap: build.query({
      providesTags: () => [{ type: "ClassOverlap" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/class_overlap",
          method: "get",
        }),
        "Something went wrong fetching class overlap"
      ),
    }),
    getClassOverlapPlot: build.query({
      providesTags: () => [{ type: "ClassOverlapPlot" }],
      queryFn: responseToData(
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/class_overlap/plot",
          method: "get",
        }),
        "Something went wrong fetching class overlap plot"
      ),
    }),
    updateDataActions: build.mutation<
      UtterancePatch[],
      PatchUtterancesQueryState & Omit<GetUtterancesQueryState, "body">
    >({
      queryFn: async ({ jobId, datasetSplitName, ignoreNotFound, body }) =>
        responseToData(
          fetchApi({
            path: "/dataset_splits/{dataset_split_name}/utterances",
            method: "patch",
          }),
          "Something went wrong updating proposed actions"
        )({ jobId, datasetSplitName, ignoreNotFound, body }),
      invalidatesTags: () => [
        "ConfidenceHistogram",
        "ConfusionMatrix",
        "Metrics",
        "MetricsPerFilter",
        "OutcomeCountPerFilter",
        "TopWords",
        "UtteranceCountPerFilter",
        "Utterances",
      ],
      async onQueryStarted(
        { ignoreNotFound, body, ...args },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          api.util.updateQueryData("getUtterances", args, (draft) => {
            draft.utterances.forEach((utterance) => {
              const found = body.find(
                // Support persistent ids that can be either strings or numbers.
                // eslint-disable-next-line eqeqeq
                ({ persistentId }) => persistentId == utterance.persistentId
              );
              if (found) {
                utterance.dataAction = found.dataAction;
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
        fetchApi({
          path: "/dataset_splits/{dataset_split_name}/confusion_matrix",
          method: "get",
        }),
        "Something went wrong fetching the confusion matrix"
      ),
    }),
    getConfig: build.query({
      providesTags: [{ type: "Config" }],
      queryFn: responseToData(
        fetchApi({ path: "/config", method: "get" }),
        "Something went wrong fetching the config"
      ),
    }),
    getDefaultConfig: build.query({
      providesTags: [{ type: "DefaultConfig" }],
      queryFn: responseToData(
        fetchApi({ path: "/config/default", method: "get" }),
        "Something went wrong fetching the default config"
      ),
    }),
    validateConfig: build.mutation<
      AzimuthConfig,
      { jobId: string; body: Partial<AzimuthConfig> }
    >({
      queryFn: responseToData(
        fetchApi({ path: "/config/validate", method: "patch" }),
        "Something went wrong validating the config"
      ),
    }),
    updateConfig: build.mutation<
      AzimuthConfig,
      { jobId: string; body: Partial<AzimuthConfig> }
    >({
      queryFn: responseToData(
        fetchApi({ path: "/config", method: "patch" }),
        "Something went wrong updating the config"
      ),
      // We invalidate Status first, so StatusCheck stops rendering the app if
      // necessary. We await queryFulfilled before invalidating the other tags.
      // We don't invalidate Status if the update fails, as StatusCheck would stop
      // rendering the app while fetching Status and the config dialog would close.
      invalidatesTags: (_, error) => (error ? [] : ["Status"]),
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
            if (partialConfig.name !== undefined) {
              draft.projectName = partialConfig.name;
            }
            if (partialConfig.model_contract !== undefined) {
              draft.modelContract = partialConfig.model_contract;
            }
            if ("behavioral_testing" in partialConfig) {
              draft.perturbationTestingAvailable = Boolean(
                partialConfig.behavioral_testing
              );
            }
            if ("pipelines" in partialConfig) {
              draft.predictionAvailable = Boolean(
                partialConfig.pipelines?.length
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
          dispatch(
            api.util.invalidateTags(
              tagTypes.filter((tag) => tag !== "Config" && tag !== "Status")
            )
          );
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
  getDefaultConfig: getDefaultConfigEndpoint,
  getConfusionMatrix: getConfusionMatrixEndpoint,
  getDatasetInfo: getDatasetInfoEndpoint,
  getDatasetWarnings: getDatasetWarningsEndpoint,
  getMetrics: getMetricsEndpoint,
  getMetricsPerFilter: getMetricsPerFilterEndpoint,
  getCustomMetricInfo: getCustomMetricInfoEndpoint,
  getClassOverlapPlot: getClassOverlapPlotEndpoint,
  getClassOverlap: getClassOverlapEndpoint,
  getOutcomeCountPerThreshold: getOutcomeCountPerThresholdEndpoint,
  getOutcomeCountPerFilter: getOutcomeCountPerFilterEndpoint,
  getUtteranceCountPerFilter: getUtteranceCountPerFilterEndpoint,
  getPerturbationTestingSummary: getPerturbationTestingSummaryEndpoint,
  getPerturbedUtterances: getPerturbedUtterancesEndpoint,
  getSimilarUtterances: getSimilarUtterancesEndpoint,
  getStatus: getStatusEndpoint,
  getTopWords: getTopWordsEndpoint,
  getUtterances: getUtterancesEndpoint,
  validateConfig: validateConfigEndpoint,
  updateConfig: updateConfigEndpoint,
  updateDataActions: updateDataActionsEndpoint,
} = api.endpoints;
