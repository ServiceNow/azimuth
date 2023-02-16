import { rest } from "msw";
import { MetricInfo, MetricsPerFilterAPIResponse } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getMetricsPerFilterAPIResponse = rest.get(
  `${baseUrl}/dataset_splits/eval/metrics/per_filter`,
  (req, res, ctx) => {
    const metricsPerFilterResponse: MetricsPerFilterAPIResponse = {
      metricsPerFilter: {
        almostCorrect: [
          {
            utteranceCount: 872,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 794,
              IncorrectAndPredicted: 78,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9105504587155964,
              Precision: 0.9110446090751722,
              Recall: 0.9105504587155964,
              F1: 0.9104901471833355,
            },
            ece: 0.08026097619205443,
          },
          {
            utteranceCount: 0,
            filterValue: "correct_top_3",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
          {
            utteranceCount: 0,
            filterValue: "correct_low_conf",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
        ],
        behavioralTesting: [
          {
            utteranceCount: 619,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 591,
              IncorrectAndPredicted: 28,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9547657512116317,
              Precision: 0.9562885800269385,
              Recall: 0.9547657512116317,
              F1: 0.9544845166948146,
            },
            ece: 0.04386170961937731,
          },
          {
            utteranceCount: 246,
            filterValue: "failed_fuzzy_matching",
            outcomeCount: {
              CorrectAndPredicted: 197,
              IncorrectAndPredicted: 49,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8008130081300813,
              Precision: 0.7983468090175408,
              Recall: 0.8008130081300813,
              F1: 0.7992244758911532,
            },
            ece: 0.169072850206034,
          },
          {
            utteranceCount: 47,
            filterValue: "failed_punctuation",
            outcomeCount: {
              CorrectAndPredicted: 33,
              IncorrectAndPredicted: 14,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.7021276595744681,
              Precision: 0.7070868661014237,
              Recall: 0.7021276595744681,
              F1: 0.6993998908892525,
            },
            ece: 0.2831996349578208,
          },
        ],
        pipelineComparison: [
          {
            utteranceCount: 872,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 794,
              IncorrectAndPredicted: 78,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9105504587155964,
              Precision: 0.9110446090751722,
              Recall: 0.9105504587155964,
              F1: 0.9104901471833355,
            },
            ece: 0.08026097619205443,
          },
          {
            utteranceCount: 0,
            filterValue: "pipeline_disagreement",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
          {
            utteranceCount: 0,
            filterValue: "incorrect_for_all_pipelines",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
        ],
        uncertain: [
          {
            utteranceCount: 872,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 794,
              IncorrectAndPredicted: 78,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9105504587155964,
              Precision: 0.9110446090751722,
              Recall: 0.9105504587155964,
              F1: 0.9104901471833355,
            },
            ece: 0.08026097619205443,
          },
          {
            utteranceCount: 0,
            filterValue: "high_epistemic_uncertainty",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
        ],
        extremeLength: [
          {
            utteranceCount: 217,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 198,
              IncorrectAndPredicted: 19,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9124423963133641,
              Precision: 0.9124885888721345,
              Recall: 0.9124423963133641,
              F1: 0.9124461154427551,
            },
            ece: 0.08615556400492436,
          },
          {
            utteranceCount: 639,
            filterValue: "long_sentence",
            outcomeCount: {
              CorrectAndPredicted: 582,
              IncorrectAndPredicted: 57,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9107981220657277,
              Precision: 0.9113619943599823,
              Recall: 0.9107981220657277,
              F1: 0.9107012885214718,
            },
            ece: 0.07806574057711874,
          },
          {
            utteranceCount: 13,
            filterValue: "multiple_sentences",
            outcomeCount: {
              CorrectAndPredicted: 11,
              IncorrectAndPredicted: 2,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8461538461538461,
              Precision: 0.8846153846153846,
              Recall: 0.8461538461538461,
              F1: 0.8443223443223442,
            },
            ece: 0.13764464855194097,
          },
          {
            utteranceCount: 3,
            filterValue: "short_utterance",
            outcomeCount: {
              CorrectAndPredicted: 3,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 1.0,
              Precision: 1.0,
              Recall: 1.0,
              F1: 1.0,
            },
            ece: 0.001278380552927616,
          },
        ],
        partialSyntax: [
          {
            utteranceCount: 626,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 562,
              IncorrectAndPredicted: 64,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8977635782747604,
              Precision: 0.8985112401237009,
              Recall: 0.8977635782747604,
              F1: 0.8975450098708789,
            },
            ece: 0.09288800971957445,
          },
          {
            utteranceCount: 183,
            filterValue: "missing_subj",
            outcomeCount: {
              CorrectAndPredicted: 173,
              IncorrectAndPredicted: 10,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9453551912568307,
              Precision: 0.9453551912568307,
              Recall: 0.9453551912568307,
              F1: 0.9453551912568307,
            },
            ece: 0.051980891514345644,
          },
          {
            utteranceCount: 108,
            filterValue: "missing_obj",
            outcomeCount: {
              CorrectAndPredicted: 100,
              IncorrectAndPredicted: 8,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9259259259259259,
              Precision: 0.9261100589225589,
              Recall: 0.9259259259259259,
              F1: 0.9256907701352146,
            },
            ece: 0.07516879340012868,
          },
          {
            utteranceCount: 72,
            filterValue: "missing_verb",
            outcomeCount: {
              CorrectAndPredicted: 68,
              IncorrectAndPredicted: 4,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9444444444444444,
              Precision: 0.9463541666666665,
              Recall: 0.9444444444444444,
              F1: 0.944662995017047,
            },
            ece: 0.05652234703302379,
          },
        ],
        dissimilar: [
          {
            utteranceCount: 311,
            filterValue: "NO_SMART_TAGS",
            outcomeCount: {
              CorrectAndPredicted: 293,
              IncorrectAndPredicted: 18,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9421221864951769,
              Precision: 0.9421221864951769,
              Recall: 0.9421221864951769,
              F1: 0.9421221864951769,
            },
            ece: 0.056714553541692525,
          },
          {
            utteranceCount: 469,
            filterValue: "no_close_train",
            outcomeCount: {
              CorrectAndPredicted: 418,
              IncorrectAndPredicted: 51,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8912579957356077,
              Precision: 0.8929892067418292,
              Recall: 0.8912579957356077,
              F1: 0.8914385899108735,
            },
            ece: 0.09796254924619627,
          },
          {
            utteranceCount: 442,
            filterValue: "no_close_eval",
            outcomeCount: {
              CorrectAndPredicted: 396,
              IncorrectAndPredicted: 46,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8959276018099548,
              Precision: 0.8961944657874712,
              Recall: 0.8959276018099548,
              F1: 0.8959875057497085,
            },
            ece: 0.0928683604589954,
          },
          {
            utteranceCount: 5,
            filterValue: "conflicting_neighbors_train",
            outcomeCount: {
              IncorrectAndPredicted: 2,
              CorrectAndPredicted: 3,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.6,
              Precision: 1.0,
              Recall: 0.6,
              F1: 0.7499999999999999,
            },
            ece: 0.39387241601943973,
          },
          {
            utteranceCount: 2,
            filterValue: "conflicting_neighbors_eval",
            outcomeCount: {
              IncorrectAndPredicted: 1,
              CorrectAndPredicted: 1,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.5,
              Precision: 0.25,
              Recall: 0.5,
              F1: 0.3333333333333333,
            },
            ece: 0.4891868233680725,
          },
        ],
        label: [
          {
            utteranceCount: 0,
            filterValue: "REJECTION_CLASS",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
          {
            utteranceCount: 444,
            filterValue: "positive",
            outcomeCount: {
              CorrectAndPredicted: 413,
              IncorrectAndPredicted: 31,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9301801801801802,
              Precision: 1.0,
              Recall: 0.9301801801801802,
              F1: 0.9638273045507585,
            },
            ece: 0.05935261714028883,
          },
          {
            utteranceCount: 428,
            filterValue: "negative",
            outcomeCount: {
              CorrectAndPredicted: 381,
              IncorrectAndPredicted: 47,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8901869158878505,
              Precision: 1.0,
              Recall: 0.8901869158878505,
              F1: 0.9419035846724352,
            },
            ece: 0.10204044945329155,
          },
        ],
        prediction: [
          {
            utteranceCount: 0,
            filterValue: "REJECTION_CLASS",
            outcomeCount: {
              CorrectAndPredicted: 0,
              CorrectAndRejected: 0,
              IncorrectAndPredicted: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {},
            ece: 0.0,
          },
          {
            utteranceCount: 460,
            filterValue: "positive",
            outcomeCount: {
              CorrectAndPredicted: 413,
              IncorrectAndPredicted: 47,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.8978260869565218,
              Precision: 0.8060916824196598,
              Recall: 0.8978260869565218,
              F1: 0.8494895164101798,
            },
            ece: 0.09851802859617315,
          },
          {
            utteranceCount: 412,
            filterValue: "negative",
            outcomeCount: {
              CorrectAndPredicted: 381,
              IncorrectAndPredicted: 31,
              CorrectAndRejected: 0,
              IncorrectAndRejected: 0,
            },
            customMetrics: {
              Accuracy: 0.9247572815533981,
              Precision: 0.8551760297860307,
              Recall: 0.9247572815533981,
              F1: 0.8886066185922943,
            },
            ece: 0.06336548823176077,
          },
        ],
      },
      utteranceCount: 872,
      metricsOverall: [
        {
          utteranceCount: 872,
          filterValue: "overall",
          outcomeCount: {
            CorrectAndPredicted: 794,
            IncorrectAndPredicted: 78,
            CorrectAndRejected: 0,
            IncorrectAndRejected: 0,
          },
          customMetrics: {
            Accuracy: 0.9105504587155964,
            Precision: 0.9110446090751722,
            Recall: 0.9105504587155964,
            F1: 0.9104901471833355,
          },
          ece: 0.08026097619205443,
        },
      ],
    };
    return res(ctx.json(metricsPerFilterResponse));
  }
);

export const getMetricsPerFilterAPIWithFailureResponse = rest.get(
  `${baseUrl}/dataset_splits/eval/metrics/per_filter`,
  (req, res, ctx) => {
    return res(ctx.status(500));
  }
);

export const getCustomMetricInfoAPIResponse = rest.get(
  `${baseUrl}/custom_metrics_info`,
  (req, res, ctx) => {
    const metricInfoResponse: Record<string, MetricInfo> = {
      Accuracy: {
        description:
          "\nAccuracy is the proportion of correct predictions among the total number of cases processed. It can be computed with:\nAccuracy = (TP + TN) / (TP + TN + FP + FN)\nTP: True positive\nTN: True negative\nFP: False positive\nFN: False negative\n",
        citation:
          "@article{scikit-learn,\n  title={Scikit-learn: Machine Learning in {P}ython},\n  author={Pedregosa, F. and Varoquaux, G. and Gramfort, A. and Michel, V.\n         and Thirion, B. and Grisel, O. and Blondel, M. and Prettenhofer, P.\n         and Weiss, R. and Dubourg, V. and Vanderplas, J. and Passos, A. and\n         Cournapeau, D. and Brucher, M. and Perrot, M. and Duchesnay, E.},\n  journal={Journal of Machine Learning Research},\n  volume={12},\n  pages={2825--2830},\n  year={2011}\n}\n",
        features: {
          predictions: { dtype: "int32", id: null, _type: "Value" },
          references: { dtype: "int32", id: null, _type: "Value" },
        },
        inputs_description:
          "\nArgs:\n    predictions: Predicted labels, as returned by a model.\n    references: Ground truth labels.\n    normalize: If False, return the number of correctly classified samples.\n        Otherwise, return the fraction of correctly classified samples.\n    sample_weight: Sample weights.\nReturns:\n    accuracy: Accuracy score.\nExamples:\n\n    >>> accuracy_metric = datasets.load_metric(\"accuracy\")\n    >>> results = accuracy_metric.compute(references=[0, 1], predictions=[0, 1])\n    >>> print(results)\n    {'accuracy': 1.0}\n",
        homepage: "",
        license: "",
        codebase_urls: [],
        reference_urls: [
          "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.accuracy_score.html",
        ],
        streamable: false,
        format: "null",
        metric_name: "accuracy",
        config_name: "default",
        experiment_id: "default_experiment",
      },
      Precision: {
        description:
          "\nPrecision is the fraction of the true examples among the predicted examples. It can be computed with:\nPrecision = TP / (TP + FP)\nTP: True positive\nFP: False positive\n",
        citation:
          "@article{scikit-learn,\n  title={Scikit-learn: Machine Learning in {P}ython},\n  author={Pedregosa, F. and Varoquaux, G. and Gramfort, A. and Michel, V.\n         and Thirion, B. and Grisel, O. and Blondel, M. and Prettenhofer, P.\n         and Weiss, R. and Dubourg, V. and Vanderplas, J. and Passos, A. and\n         Cournapeau, D. and Brucher, M. and Perrot, M. and Duchesnay, E.},\n  journal={Journal of Machine Learning Research},\n  volume={12},\n  pages={2825--2830},\n  year={2011}\n}\n",
        features: {
          predictions: { dtype: "int32", id: null, _type: "Value" },
          references: { dtype: "int32", id: null, _type: "Value" },
        },
        inputs_description:
          "\nArgs:\n    predictions: Predicted labels, as returned by a model.\n    references: Ground truth labels.\n    labels: The set of labels to include when average != 'binary', and\n        their order if average is None. Labels present in the data can\n        be excluded, for example to calculate a multiclass average ignoring\n        a majority negative class, while labels not present in the data will\n        result in 0 components in a macro average. For multilabel targets,\n        labels are column indices. By default, all labels in y_true and\n        y_pred are used in sorted order.\n    average: This parameter is required for multiclass/multilabel targets.\n        If None, the scores for each class are returned. Otherwise, this\n        determines the type of averaging performed on the data:\n            binary: Only report results for the class specified by pos_label.\n                This is applicable only if targets (y_{true,pred}) are binary.\n            micro: Calculate metrics globally by counting the total true positives,\n                false negatives and false positives.\n            macro: Calculate metrics for each label, and find their unweighted mean.\n                This does not take label imbalance into account.\n            weighted: Calculate metrics for each label, and find their average\n                weighted by support (the number of true instances for each label).\n                This alters ‘macro’ to account for label imbalance; it can result\n                in an F-score that is not between precision and recall.\n            samples: Calculate metrics for each instance, and find their average\n                (only meaningful for multilabel classification).\n    sample_weight: Sample weights.\n    zero_division (\"warn\", 0 or 1, default=\"warn\"): Sets the value to return when there is a zero division.\n        If set to \"warn\", this acts as 0, but warnings are also raised.\n\nReturns:\n    precision: Precision score.\n\nExamples:\n\n    >>> precision_metric = datasets.load_metric(\"precision\")\n    >>> results = precision_metric.compute(references=[0, 1], predictions=[0, 1])\n    >>> print(results)\n    {'precision': 1.0}\n\n    >>> predictions = [0, 2, 1, 0, 0, 1]\n    >>> references = [0, 1, 2, 0, 1, 2]\n    >>> results = precision_metric.compute(predictions=predictions, references=references, average='macro')\n    >>> print(results)\n    {'precision': 0.2222222222222222}\n    >>> results = precision_metric.compute(predictions=predictions, references=references, average='micro')\n    >>> print(results)\n    {'precision': 0.3333333333333333}\n    >>> results = precision_metric.compute(predictions=predictions, references=references, average='weighted')\n    >>> print(results)\n    {'precision': 0.2222222222222222}\n    >>> results = precision_metric.compute(predictions=predictions, references=references, average=None)\n    >>> print(results)\n    {'precision': array([0.66666667, 0.        , 0.        ])}\n",
        homepage: "",
        license: "",
        codebase_urls: [],
        reference_urls: [
          "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_score.html",
        ],
        streamable: false,
        format: "null",
        metric_name: "precision",
        config_name: "default",
        experiment_id: "default_experiment",
      },
      Recall: {
        description:
          "\nRecall is the fraction of the total amount of relevant examples that were actually retrieved. It can be computed with:\nRecall = TP / (TP + FN)\nTP: True positive\nFN: False negative\n",
        citation:
          "@article{scikit-learn,\n  title={Scikit-learn: Machine Learning in {P}ython},\n  author={Pedregosa, F. and Varoquaux, G. and Gramfort, A. and Michel, V.\n         and Thirion, B. and Grisel, O. and Blondel, M. and Prettenhofer, P.\n         and Weiss, R. and Dubourg, V. and Vanderplas, J. and Passos, A. and\n         Cournapeau, D. and Brucher, M. and Perrot, M. and Duchesnay, E.},\n  journal={Journal of Machine Learning Research},\n  volume={12},\n  pages={2825--2830},\n  year={2011}\n}\n",
        features: {
          predictions: { dtype: "int32", id: null, _type: "Value" },
          references: { dtype: "int32", id: null, _type: "Value" },
        },
        inputs_description:
          "\nArgs:\n    predictions: Predicted labels, as returned by a model.\n    references: Ground truth labels.\n    labels: The set of labels to include when average != 'binary', and\n        their order if average is None. Labels present in the data can\n        be excluded, for example to calculate a multiclass average ignoring\n        a majority negative class, while labels not present in the data will\n        result in 0 components in a macro average. For multilabel targets,\n        labels are column indices. By default, all labels in y_true and\n        y_pred are used in sorted order.\n    average: This parameter is required for multiclass/multilabel targets.\n        If None, the scores for each class are returned. Otherwise, this\n        determines the type of averaging performed on the data:\n            binary: Only report results for the class specified by pos_label.\n                This is applicable only if targets (y_{true,pred}) are binary.\n            micro: Calculate metrics globally by counting the total true positives,\n                false negatives and false positives.\n            macro: Calculate metrics for each label, and find their unweighted mean.\n                This does not take label imbalance into account.\n            weighted: Calculate metrics for each label, and find their average\n                weighted by support (the number of true instances for each label).\n                This alters ‘macro’ to account for label imbalance; it can result\n                in an F-score that is not between precision and recall.\n            samples: Calculate metrics for each instance, and find their average\n                (only meaningful for multilabel classification).\n    sample_weight: Sample weights.\n    zero_division (\"warn\", 0 or 1, default=\"warn\"): Sets the value to return when there is a zero division.\n        If set to \"warn\", this acts as 0, but warnings are also raised.\n\nReturns:\n    recall: Recall score.\n\nExamples:\n\n    >>> recall_metric = datasets.load_metric(\"recall\")\n    >>> results = recall_metric.compute(references=[0, 1], predictions=[0, 1])\n    >>> print(results)\n    {'recall': 1.0}\n\n    >>> predictions = [0, 2, 1, 0, 0, 1]\n    >>> references = [0, 1, 2, 0, 1, 2]\n    >>> results = recall_metric.compute(predictions=predictions, references=references, average='macro')\n    >>> print(results)\n    {'recall': 0.3333333333333333}\n    >>> results = recall_metric.compute(predictions=predictions, references=references, average='micro')\n    >>> print(results)\n    {'recall': 0.3333333333333333}\n    >>> results = recall_metric.compute(predictions=predictions, references=references, average='weighted')\n    >>> print(results)\n    {'recall': 0.3333333333333333}\n    >>> results = recall_metric.compute(predictions=predictions, references=references, average=None)\n    >>> print(results)\n    {'recall': array([1., 0., 0.])}\n",
        homepage: "",
        license: "",
        codebase_urls: [],
        reference_urls: [
          "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.recall_score.html",
        ],
        streamable: false,
        format: "null",
        metric_name: "recall",
        config_name: "default",
        experiment_id: "default_experiment",
      },
      F1: {
        description:
          "\nThe F1 score is the harmonic mean of the precision and recall. It can be computed with:\nF1 = 2 * (precision * recall) / (precision + recall)\n",
        citation:
          "@article{scikit-learn,\n  title={Scikit-learn: Machine Learning in {P}ython},\n  author={Pedregosa, F. and Varoquaux, G. and Gramfort, A. and Michel, V.\n         and Thirion, B. and Grisel, O. and Blondel, M. and Prettenhofer, P.\n         and Weiss, R. and Dubourg, V. and Vanderplas, J. and Passos, A. and\n         Cournapeau, D. and Brucher, M. and Perrot, M. and Duchesnay, E.},\n  journal={Journal of Machine Learning Research},\n  volume={12},\n  pages={2825--2830},\n  year={2011}\n}\n",
        features: {
          predictions: { dtype: "int32", id: null, _type: "Value" },
          references: { dtype: "int32", id: null, _type: "Value" },
        },
        inputs_description:
          "\nArgs:\n    predictions: Predicted labels, as returned by a model.\n    references: Ground truth labels.\n    labels: The set of labels to include when average != 'binary', and\n        their order if average is None. Labels present in the data can\n        be excluded, for example to calculate a multiclass average ignoring\n        a majority negative class, while labels not present in the data will\n        result in 0 components in a macro average. For multilabel targets,\n        labels are column indices. By default, all labels in y_true and\n        y_pred are used in sorted order.\n    average: This parameter is required for multiclass/multilabel targets.\n        If None, the scores for each class are returned. Otherwise, this\n        determines the type of averaging performed on the data:\n            binary: Only report results for the class specified by pos_label.\n                This is applicable only if targets (y_{true,pred}) are binary.\n            micro: Calculate metrics globally by counting the total true positives,\n                false negatives and false positives.\n            macro: Calculate metrics for each label, and find their unweighted mean.\n                This does not take label imbalance into account.\n            weighted: Calculate metrics for each label, and find their average\n                weighted by support (the number of true instances for each label).\n                This alters ‘macro’ to account for label imbalance; it can result\n                in an F-score that is not between precision and recall.\n            samples: Calculate metrics for each instance, and find their average\n                (only meaningful for multilabel classification).\n    sample_weight: Sample weights.\nReturns:\n    f1: F1 score.\nExamples:\n\n    >>> f1_metric = datasets.load_metric(\"f1\")\n    >>> results = f1_metric.compute(predictions=[0, 1], references=[0, 1])\n    >>> print(results)\n    {'f1': 1.0}\n\n    >>> predictions = [0, 2, 1, 0, 0, 1]\n    >>> references = [0, 1, 2, 0, 1, 2]\n    >>> results = f1_metric.compute(predictions=predictions, references=references, average=\"macro\")\n    >>> print(results)\n    {'f1': 0.26666666666666666}\n    >>> results = f1_metric.compute(predictions=predictions, references=references, average=\"micro\")\n    >>> print(results)\n    {'f1': 0.3333333333333333}\n    >>> results = f1_metric.compute(predictions=predictions, references=references, average=\"weighted\")\n    >>> print(results)\n    {'f1': 0.26666666666666666}\n    >>> results = f1_metric.compute(predictions=predictions, references=references, average=None)\n    >>> print(results)\n    {'f1': array([0.8, 0. , 0. ])}\n",
        homepage: "",
        license: "",
        codebase_urls: [],
        reference_urls: [
          "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.f1_score.html",
        ],
        streamable: false,
        format: "null",
        metric_name: "f1",
        config_name: "default",
        experiment_id: "default_experiment",
      },
    };
    return res(ctx.json(metricInfoResponse));
  }
);
