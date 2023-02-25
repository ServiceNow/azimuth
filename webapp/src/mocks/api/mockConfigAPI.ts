import { rest } from "msw";
import { AzimuthConfig } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getConfigAPIResponse = rest.get(
  `${baseUrl}/config`,
  (req, res, ctx) => {
    const azimuthConfigResponse: AzimuthConfig = {
      name: "Sentiment Analysis",
      dataset: {
        class_name: "loading_resources.load_sst2_dataset",
        args: [],
        kwargs: {},
        remote: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
      },
      columns: {
        text_input: "utterance",
        raw_text_input: "utterance_raw",
        label: "label",
        failed_parsing_reason: "failed_parsing_reason",
        persistent_id: "row_idx",
      },
      rejection_class: null,
      artifact_path: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/cache",
      batch_size: 32,
      use_cuda: "auto",
      large_dask_cluster: false,
      read_only_config: false,
      dataset_warnings: {
        min_num_per_class: 20,
        max_delta_class_imbalance: 0.5,
        max_delta_representation: 0.05,
        max_delta_mean_words: 3.0,
        max_delta_std_words: 3.0,
      },
      model_contract: "hf_text_classification",
      pipelines: [
        {
          name: "Pipeline_0",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpoint_path:
                "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              class_name: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
      ],
      uncertainty: { iterations: 1, high_epistemic_threshold: 0.1 },
      saliency_layer: "distilbert.embeddings.word_embeddings",
      syntax: {
        short_utterance_max_word: 3,
        long_utterance_min_word: 12,
        spacy_model: "en_core_web_sm",
        subj_tags: ["nsubj", "nsubjpass"],
        obj_tags: ["dobj", "pobj", "obj"],
      },
      metrics: {
        Accuracy: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "accuracy" },
          remote: null,
          additional_kwargs: {},
        },
        Precision: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "precision" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
        Recall: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "recall" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
        F1: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "f1" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
      },
      language: "en",
      similarity: {
        faiss_encoder: "all-MiniLM-L12-v2",
        conflicting_neighbors_threshold: 0.9,
        no_close_threshold: 0.5,
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
    return res(ctx.json(azimuthConfigResponse));
  }
);

export const getConfigMultipipelineAPIResponse = rest.get(
  `${baseUrl}/config`,
  (req, res, ctx) => {
    const azimuthConfigMultipipelineResponse: AzimuthConfig = {
      name: "Sentiment Analysis",
      dataset: {
        class_name: "loading_resources.load_sst2_dataset",
        args: [],
        kwargs: {},
        remote: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
      },
      columns: {
        text_input: "utterance",
        raw_text_input: "utterance_raw",
        label: "label",
        failed_parsing_reason: "failed_parsing_reason",
        persistent_id: "row_idx",
      },
      rejection_class: null,
      artifact_path: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/cache",
      batch_size: 32,
      use_cuda: "auto",
      large_dask_cluster: false,
      read_only_config: false,
      dataset_warnings: {
        min_num_per_class: 20,
        max_delta_class_imbalance: 0.5,
        max_delta_representation: 0.05,
        max_delta_mean_words: 3.0,
        max_delta_std_words: 3.0,
      },
      model_contract: "hf_text_classification",
      pipelines: [
        {
          name: "Pipeline_0",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpoint_path:
                "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              class_name: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
        {
          name: "Pipeline_1",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpoint_path:
                "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              class_name: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
        {
          name: "Pipeline_2",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpoint_path:
                "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              class_name: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
        {
          name: "Pipeline_3",
          model: {
            class_name: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpoint_path:
                "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              class_name: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
      ],
      uncertainty: { iterations: 1, high_epistemic_threshold: 0.1 },
      saliency_layer: "distilbert.embeddings.word_embeddings",
      syntax: {
        short_utterance_max_word: 3,
        long_utterance_min_word: 12,
        spacy_model: "en_core_web_sm",
        subj_tags: ["nsubj", "nsubjpass"],
        obj_tags: ["dobj", "pobj", "obj"],
      },
      metrics: {
        Accuracy: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "accuracy" },
          remote: null,
          additional_kwargs: {},
        },
        Precision: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "precision" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
        Recall: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "recall" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
        F1: {
          class_name: "datasets.load_metric",
          args: [],
          kwargs: { path: "f1" },
          remote: null,
          additional_kwargs: { average: "weighted" },
        },
      },
      language: "en",
      similarity: {
        faiss_encoder: "all-MiniLM-L12-v2",
        conflicting_neighbors_threshold: 0.9,
        no_close_threshold: 0.5,
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
    return res(ctx.json(azimuthConfigMultipipelineResponse));
  }
);
