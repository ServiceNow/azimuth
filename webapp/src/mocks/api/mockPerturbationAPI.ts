import { rest } from "msw";
import { PerturbationTestingSummary } from "types/api";

const baseUrl = "http://localhost/api/local";

export const getPerturbationResponse = rest.get(
  `${baseUrl}/perturbation_testing_summary`,
  (req, res, ctx) => {
    const datasetInfoResponse: PerturbationTestingSummary = {
      allTestsSummary: [
        {
          name: "Contractions",
          description: "Contract expressions in the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "Contraction",
          evalFailureRate: 0.0,
          evalCount: 4,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.1052,
          trainFailureRate: 0.0,
          trainCount: 0,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.0,
          example: {
            utterance: "what day of the month do i have to pay my mortgage",
            perturbedUtterance:
              "what day of the month do i've to pay my mortgage",
          },
        },
        {
          name: "Contractions",
          description: "Expand expressions in the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "Expansion",
          evalFailureRate: 0.0,
          evalCount: 1,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.0064,
          trainFailureRate: 0.0,
          trainCount: 1,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.4598,
          example: {
            utterance: "what's the total i've spent on shoes this month",
            perturbedUtterance:
              "what is the total i have spent on shoes this month",
          },
        },
        {
          name: "Neutral Token",
          description: "Append a neutral token to the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.16304347826086957,
          evalCount: 92,
          evalFailedCount: 15,
          evalConfidenceDelta: 0.03828051948051948,
          trainFailureRate: 0.14705882352941177,
          trainCount: 68,
          trainFailedCount: 10,
          trainConfidenceDelta: 0.030703448275862067,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen pls",
          },
        },
        {
          name: "Neutral Token",
          description: "Prepend a neutral token to the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "PreInsertion",
          evalFailureRate: 0.10869565217391304,
          evalCount: 92,
          evalFailedCount: 10,
          evalConfidenceDelta: 0.04716585365853659,
          trainFailureRate: 0.20588235294117646,
          trainCount: 68,
          trainFailedCount: 14,
          trainConfidenceDelta: 0.04457592592592592,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "pls i need my bank account frozen",
          },
        },
        {
          name: "Typos",
          description: "Delete characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Deletion",
          evalFailureRate: 0.043478260869565216,
          evalCount: 23,
          evalFailedCount: 1,
          evalConfidenceDelta: 0.08070909090909091,
          trainFailureRate: 0.23529411764705882,
          trainCount: 17,
          trainFailedCount: 4,
          trainConfidenceDelta: 0.09272307692307692,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bnk account frozen",
          },
        },
        {
          name: "Typos",
          description: "Replace characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Replacement",
          evalFailureRate: 0.30434782608695654,
          evalCount: 23,
          evalFailedCount: 7,
          evalConfidenceDelta: 0.069,
          trainFailureRate: 0.17647058823529413,
          trainCount: 17,
          trainFailedCount: 3,
          trainConfidenceDelta: 0.08399999999999999,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank acDount frozen",
          },
        },
        {
          name: "Typos",
          description: "Swap characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Swap",
          evalFailureRate: 0.21739130434782608,
          evalCount: 23,
          evalFailedCount: 5,
          evalConfidenceDelta: 0.025333333333333333,
          trainFailureRate: 0.23529411764705882,
          trainCount: 17,
          trainFailedCount: 4,
          trainConfidenceDelta: 0.12286153846153845,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frzoen",
          },
        },
        {
          name: "Ending Period",
          description: "Append period at the end of the utterance.",
          family: "Punctuation",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.08695652173913043,
          evalCount: 23,
          evalFailedCount: 2,
          evalConfidenceDelta: 0.03225714285714286,
          trainFailureRate: 0.11764705882352941,
          trainCount: 17,
          trainFailedCount: 2,
          trainConfidenceDelta: 0.04274,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen.",
          },
        },
        {
          name: "Inner Comma",
          description: "Delete comma inside the utterance.",
          family: "Punctuation",
          perturbationType: "Deletion",
          evalFailureRate: 0.0,
          evalCount: 1,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.0034,
          trainFailureRate: 0.0,
          trainCount: 1,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.0012,
          example: {
            utterance: "what is up with my account, why is it blocked",
            perturbedUtterance: "what is up with my account why is it blocked",
          },
        },
        {
          name: "Inner Comma",
          description: "Insert comma inside the utterance.",
          family: "Punctuation",
          perturbationType: "Insertion",
          evalFailureRate: 0.13636363636363635,
          evalCount: 22,
          evalFailedCount: 3,
          evalConfidenceDelta: 0.03607894736842105,
          trainFailureRate: 0.0625,
          trainCount: 16,
          trainFailedCount: 1,
          trainConfidenceDelta: 0.05998,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my, bank account frozen",
          },
        },
        {
          name: "Inner Period",
          description: "Insert period inside the utterance.",
          family: "Punctuation",
          perturbationType: "Insertion",
          evalFailureRate: 0.17391304347826086,
          evalCount: 23,
          evalFailedCount: 4,
          evalConfidenceDelta: 0.032878947368421056,
          trainFailureRate: 0.058823529411764705,
          trainCount: 17,
          trainFailedCount: 1,
          trainConfidenceDelta: 0.06339375,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my. bank account frozen",
          },
        },
        {
          name: "Question Mark",
          description: "Append question mark at the end of the utterance.",
          family: "Punctuation",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.08695652173913043,
          evalCount: 23,
          evalFailedCount: 2,
          evalConfidenceDelta: 0.018895238095238093,
          trainFailureRate: 0.11764705882352941,
          trainCount: 17,
          trainFailedCount: 2,
          trainConfidenceDelta: 0.01038,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen?",
          },
        },
      ],
      failureRates: { eval: 0.14, train: 0.16015625 },
    };
    return res(ctx.json(datasetInfoResponse));
  }
);

export const getPerturbationResponseWithoutTrainFailureRate = rest.get(
  `${baseUrl}/perturbation_testing_summary`,
  (req, res, ctx) => {
    const datasetInfoResponse: PerturbationTestingSummary = {
      allTestsSummary: [
        {
          name: "Contractions",
          description: "Contract expressions in the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "Contraction",
          evalFailureRate: 0.0,
          evalCount: 4,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.1052,
          trainFailureRate: 0.0,
          trainCount: 0,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.0,
          example: {
            utterance: "what day of the month do i have to pay my mortgage",
            perturbedUtterance:
              "what day of the month do i've to pay my mortgage",
          },
        },
        {
          name: "Contractions",
          description: "Expand expressions in the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "Expansion",
          evalFailureRate: 0.0,
          evalCount: 1,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.0064,
          trainFailureRate: 0.0,
          trainCount: 1,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.4598,
          example: {
            utterance: "what's the total i've spent on shoes this month",
            perturbedUtterance:
              "what is the total i have spent on shoes this month",
          },
        },
        {
          name: "Neutral Token",
          description: "Append a neutral token to the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.16304347826086957,
          evalCount: 92,
          evalFailedCount: 15,
          evalConfidenceDelta: 0.03828051948051948,
          trainFailureRate: 0.14705882352941177,
          trainCount: 68,
          trainFailedCount: 10,
          trainConfidenceDelta: 0.030703448275862067,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen pls",
          },
        },
        {
          name: "Neutral Token",
          description: "Prepend a neutral token to the utterance.",
          family: "Fuzzy Matching",
          perturbationType: "PreInsertion",
          evalFailureRate: 0.10869565217391304,
          evalCount: 92,
          evalFailedCount: 10,
          evalConfidenceDelta: 0.04716585365853659,
          trainFailureRate: 0.20588235294117646,
          trainCount: 68,
          trainFailedCount: 14,
          trainConfidenceDelta: 0.04457592592592592,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "pls i need my bank account frozen",
          },
        },
        {
          name: "Typos",
          description: "Delete characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Deletion",
          evalFailureRate: 0.043478260869565216,
          evalCount: 23,
          evalFailedCount: 1,
          evalConfidenceDelta: 0.08070909090909091,
          trainFailureRate: 0.23529411764705882,
          trainCount: 17,
          trainFailedCount: 4,
          trainConfidenceDelta: 0.09272307692307692,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bnk account frozen",
          },
        },
        {
          name: "Typos",
          description: "Replace characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Replacement",
          evalFailureRate: 0.30434782608695654,
          evalCount: 23,
          evalFailedCount: 7,
          evalConfidenceDelta: 0.069,
          trainFailureRate: 0.17647058823529413,
          trainCount: 17,
          trainFailedCount: 3,
          trainConfidenceDelta: 0.08399999999999999,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank acDount frozen",
          },
        },
        {
          name: "Typos",
          description: "Swap characters in the utterance to create typos.",
          family: "Fuzzy Matching",
          perturbationType: "Swap",
          evalFailureRate: 0.21739130434782608,
          evalCount: 23,
          evalFailedCount: 5,
          evalConfidenceDelta: 0.025333333333333333,
          trainFailureRate: 0.23529411764705882,
          trainCount: 17,
          trainFailedCount: 4,
          trainConfidenceDelta: 0.12286153846153845,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frzoen",
          },
        },
        {
          name: "Ending Period",
          description: "Append period at the end of the utterance.",
          family: "Punctuation",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.08695652173913043,
          evalCount: 23,
          evalFailedCount: 2,
          evalConfidenceDelta: 0.03225714285714286,
          trainFailureRate: 0.11764705882352941,
          trainCount: 17,
          trainFailedCount: 2,
          trainConfidenceDelta: 0.04274,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen.",
          },
        },
        {
          name: "Inner Comma",
          description: "Delete comma inside the utterance.",
          family: "Punctuation",
          perturbationType: "Deletion",
          evalFailureRate: 0.0,
          evalCount: 1,
          evalFailedCount: 0,
          evalConfidenceDelta: 0.0034,
          trainFailureRate: 0.0,
          trainCount: 1,
          trainFailedCount: 0,
          trainConfidenceDelta: 0.0012,
          example: {
            utterance: "what is up with my account, why is it blocked",
            perturbedUtterance: "what is up with my account why is it blocked",
          },
        },
        {
          name: "Inner Comma",
          description: "Insert comma inside the utterance.",
          family: "Punctuation",
          perturbationType: "Insertion",
          evalFailureRate: 0.13636363636363635,
          evalCount: 22,
          evalFailedCount: 3,
          evalConfidenceDelta: 0.03607894736842105,
          trainFailureRate: 0.0625,
          trainCount: 16,
          trainFailedCount: 1,
          trainConfidenceDelta: 0.05998,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my, bank account frozen",
          },
        },
        {
          name: "Inner Period",
          description: "Insert period inside the utterance.",
          family: "Punctuation",
          perturbationType: "Insertion",
          evalFailureRate: 0.17391304347826086,
          evalCount: 23,
          evalFailedCount: 4,
          evalConfidenceDelta: 0.032878947368421056,
          trainFailureRate: 0.058823529411764705,
          trainCount: 17,
          trainFailedCount: 1,
          trainConfidenceDelta: 0.06339375,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my. bank account frozen",
          },
        },
        {
          name: "Question Mark",
          description: "Append question mark at the end of the utterance.",
          family: "Punctuation",
          perturbationType: "PostInsertion",
          evalFailureRate: 0.08695652173913043,
          evalCount: 23,
          evalFailedCount: 2,
          evalConfidenceDelta: 0.018895238095238093,
          trainFailureRate: 0.11764705882352941,
          trainCount: 17,
          trainFailedCount: 2,
          trainConfidenceDelta: 0.01038,
          example: {
            utterance: "i need my bank account frozen",
            perturbedUtterance: "i need my bank account frozen?",
          },
        },
      ],
      failureRates: { eval: 0.14 },
    };
    return res(ctx.json(datasetInfoResponse));
  }
);

export const getPerturbationResponseWithFailureResponse = rest.get(
  `${baseUrl}/perturbation_testing_summary`,
  (req, res, ctx) => {
    return res(ctx.status(500));
  }
);
