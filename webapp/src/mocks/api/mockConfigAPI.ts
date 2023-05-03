import { rest } from "msw";
import { AzimuthConfig } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getConfigAPIResponse = rest.get(
  `${baseUrl}/config`,
  (req, res, ctx) => {
    const azimuthConfigResponse: AzimuthConfig = {
      name: "Sentiment Analysis",
      dataset: {
        className: "loading_resources.load_sst2_dataset",
        args: [],
        kwargs: {},
        remote: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
      },
      columns: {
        textInput: "utterance",
        rawTextInput: "utterance_raw",
        label: "label",
        failedParsingReason: "failed_parsing_reason",
        persistentId: "row_idx",
      },
      rejectionClass: null,
      artifactPath: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/cache",
      batchSize: 32,
      useCuda: "auto",
      largeDaskCluster: false,
      readOnlyConfig: false,
      datasetWarnings: {
        minNumPerClass: 20,
        maxDeltaClassImbalance: 0.5,
        maxDeltaRepresentation: 0.05,
        maxDeltaMeanWords: 3.0,
        maxDeltaStdWords: 3.0,
      },
      modelContract: "hf_text_classification",
      pipelines: [
        {
          name: "Pipeline_0",
          model: {
            className: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpointPath: "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              className: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
      ],
      uncertainty: { iterations: 1, highEpistemicThreshold: 0.1 },
      saliencyLayer: "distilbert.embeddings.word_embeddings",
      syntax: {
        shortUtteranceMaxWord: 3,
        longUtteranceMinWord: 12,
        spacyModel: "en_core_web_sm",
        subjTags: ["nsubj", "nsubjpass"],
        objTags: ["dobj", "pobj", "obj"],
      },
      metrics: {
        Accuracy: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "accuracy" },
          remote: null,
          additionalKwargs: {},
        },
        Precision: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "precision" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
        Recall: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "recall" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
        F1: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "f1" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
      },
      language: "en",
      similarity: {
        faissEncoder: "all-MiniLM-L12-v2",
        conflictingNeighborsThreshold: 0.9,
        noCloseThreshold: 0.5,
      },
      behavioralTesting: {
        neutralToken: {
          threshold: 1.0,
          suffixList: ["pls", "please", "thank you", "appreciated"],
          prefixList: ["pls", "please", "hello", "greetings"],
        },
        punctuation: { threshold: 1.0 },
        fuzzyMatching: { threshold: 1.0 },
        typo: { threshold: 1.0, nbTyposPerUtterance: 1 },
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
        className: "loading_resources.load_sst2_dataset",
        args: [],
        kwargs: {},
        remote: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
      },
      columns: {
        textInput: "utterance",
        rawTextInput: "utterance_raw",
        label: "label",
        failedParsingReason: "failed_parsing_reason",
        persistentId: "row_idx",
      },
      rejectionClass: null,
      artifactPath: "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/cache",
      batchSize: 32,
      useCuda: "auto",
      largeDaskCluster: false,
      readOnlyConfig: false,
      datasetWarnings: {
        minNumPerClass: 20,
        maxDeltaClassImbalance: 0.5,
        maxDeltaRepresentation: 0.05,
        maxDeltaMeanWords: 3.0,
        maxDeltaStdWords: 3.0,
      },
      modelContract: "hf_text_classification",
      pipelines: [
        {
          name: "Pipeline_0",
          model: {
            className: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpointPath: "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              className: "azimuth.utils.ml.postprocessing.Thresholding",
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
            className: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpointPath: "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              className: "azimuth.utils.ml.postprocessing.Thresholding",
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
            className: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpointPath: "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              className: "azimuth.utils.ml.postprocessing.Thresholding",
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
            className: "loading_resources.load_hf_text_classif_pipeline",
            args: [],
            kwargs: {
              checkpointPath: "distilbert-base-uncased-finetuned-sst-2-english",
            },
            remote:
              "/Users/nandhini.babu/OpenSource-Azimuth/azimuth/azimuth_shr",
          },
          postprocessors: [
            {
              className: "azimuth.utils.ml.postprocessing.Thresholding",
              args: [],
              kwargs: { threshold: 0.5 },
              remote: null,
              threshold: 0.5,
            },
          ],
        },
      ],
      uncertainty: { iterations: 1, highEpistemicThreshold: 0.1 },
      saliencyLayer: "distilbert.embeddings.word_embeddings",
      syntax: {
        shortUtteranceMaxWord: 3,
        longUtteranceMinWord: 12,
        spacyModel: "en_core_web_sm",
        subjTags: ["nsubj", "nsubjpass"],
        objTags: ["dobj", "pobj", "obj"],
      },
      metrics: {
        Accuracy: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "accuracy" },
          remote: null,
          additionalKwargs: {},
        },
        Precision: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "precision" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
        Recall: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "recall" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
        F1: {
          className: "datasets.load_metric",
          args: [],
          kwargs: { path: "f1" },
          remote: null,
          additionalKwargs: { average: "weighted" },
        },
      },
      language: "en",
      similarity: {
        faissEncoder: "all-MiniLM-L12-v2",
        conflictingNeighborsThreshold: 0.9,
        noCloseThreshold: 0.5,
      },
      behavioralTesting: {
        neutralToken: {
          threshold: 1.0,
          suffixList: ["pls", "please", "thank you", "appreciated"],
          prefixList: ["pls", "please", "hello", "greetings"],
        },
        punctuation: { threshold: 1.0 },
        fuzzyMatching: { threshold: 1.0 },
        typo: { threshold: 1.0, nbTyposPerUtterance: 1 },
        seed: 300,
      },
    };
    return res(ctx.json(azimuthConfigMultipipelineResponse));
  }
);
