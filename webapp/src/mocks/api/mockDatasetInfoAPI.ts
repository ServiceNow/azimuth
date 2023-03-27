import { rest } from "msw";
import { DatasetInfoResponse } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getDatasetInfoAPIResponse = rest.get(
  `${baseUrl}/dataset_info`,
  (req, res, ctx) => {
    const datasetInfoResponse: DatasetInfoResponse = {
      projectName: "Sentiment Analysis",
      classNames: ["negative", "positive", "REJECTION_CLASS"],
      dataActions: [
        "relabel",
        "augment_with_similar",
        "define_new_class",
        "merge_classes",
        "remove",
        "investigate",
        "NO_ACTION",
      ],
      smartTags: [
        "multiple_sentences",
        "long_utterance",
        "short_utterance",
        "missing_subj",
        "missing_obj",
        "missing_verb",
        "conflicting_neighbors_train",
        "conflicting_neighbors_eval",
        "no_close_train",
        "no_close_eval",
        "failed_punctuation",
        "failed_fuzzy_matching",
        "high_epistemic_uncertainty",
        "correct_top_3",
        "correct_low_conf",
        "incorrect_for_all_pipelines",
        "pipeline_disagreement",
        "NO_SMART_TAGS",
      ],
      evalClassDistribution: [428, 444, 0],
      trainClassDistribution: [458, 542, 0],
      startupTasks: {
        syntax_tags_eval: "finished",
        syntax_tags_train: "finished",
        prediction_eval: "finished",
        prediction_train: "finished",
        saliency_eval: "finished",
        saliency_train: "finished",
        outcome_count_eval: "finished",
        outcome_count_train: "finished",
        confidence_bins_eval: "finished",
        confidence_bins_train: "finished",
        metrics_by_filter_eval: "finished",
        metrics_by_filter_train: "finished",
        perturbation_testing_eval: "finished",
        perturbation_testing_train: "finished",
        perturbation_testing_summary_all: "finished",
        prediction_bma_eval: "finished",
        prediction_bma_train: "finished",
        outcome_count_per_threshold_eval: "finished",
        neighbors_tags_eval: "not_started",
        neighbors_tags_train: "not_started",
        class_overlap_train: "not_started",
      },
      modelContract: "hf_text_classification",
      predictionAvailable: true,
      perturbationTestingAvailable: true,
      availableDatasetSplits: { train: true, eval: true },
      similarityAvailable: true,
      postprocessingEditable: [true],
    };
    return res(ctx.json(datasetInfoResponse));
  }
);
