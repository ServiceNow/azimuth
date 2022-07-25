import { rest } from "msw";
import { AzimuthConfig } from "types/api";

const baseUrl = "http://localhost/api/local";
export const getConfig = rest.get(
  `${baseUrl}/admin/config`,
  (req, res, ctx) => {
    const config: AzimuthConfig = {
      name: "CLINC Dummy",
      dataset: {
        class_name: "loading_resources.load_CLINC150_data",
        args: [],
        kwargs: {},
        remote: "/Users/nandhini.babu/openSource/azimuth_shr",
      },
      model_contract: "hf_text_classification",
      columns: {
        text_input: "utterance",
        raw_text_input: "utterance_raw",
        label: "label",
        failed_parsing_reason: "failed_parsing_reason",
      },
      rejection_class: "NO_INTENT",
      artifact_path: "/Users/nandhini.babu/openSource/cache",
      batch_size: 32,
      dataset_warnings: {
        min_num_per_class: 20,
        max_delta_representation: 0.05,
        max_delta_mean_tokens: 3.0,
        max_delta_std_tokens: 3.0,
      },
      similarity: {
        faiss_encoder: "all-MiniLM-L12-v2",
        conflicting_neighbors_threshold: 0.9,
        no_close_threshold: 0.5,
      },
      pipelines: [
        {
          name: "Pipeline_0",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {},
            remote: "/Users/nandhini.babu/openSource/azimuth_shr",
          },
          postprocessors: [],
        },
      ],
      uncertainty: { iterations: 1, high_epistemic_threshold: 0.1 },
      saliency_layer: "distilbert.embeddings.word_embeddings",
      metrics: {
        Precision: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: {},
          additional_kwargs: { average: "weighted" },
        },
        Recall: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: {},
          additional_kwargs: { average: "weighted" },
        },
        F1: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: {},
          additional_kwargs: { average: "weighted" },
        },
      },
      behavioral_testing: {
        neutral_token: {
          threshold: 1.0,
          suffix_list: ["pls", "please", "thank you", "appreciated"],
          prefix_list: ["pls", "please", "hello", "greetings"],
        },
        punctuation: { threshold: 1.0 },
        fuzzy_matching: { threshold: 1.0 },
        typo: { threshold: 1.0, nb_typos_per_utterance: 1 },
        seed: 300,
      },
    };
    return res(ctx.json(config));
  }
);
