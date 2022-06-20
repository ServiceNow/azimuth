import {
  parseSearchString,
  constructSearchString,
  constructApiSearchString,
} from "utils/helpers";

test("convertSearchParamsToFilterState", () => {
  expect(parseSearchString("").filters).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    labels: undefined,
    predictions: undefined,
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    uncertain: undefined,
    dataActions: undefined,
    outcomes: undefined,
    utterance: undefined,
  });

  expect(
    parseSearchString(
      "?labels=1,2&predictions=3,4&partialSyntax=missing_obj,missing_subj&dataActions=remove,relabel&outcomes=CorrectAndPredicted,IncorrectAndRejected"
    ).filters
  ).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    labels: ["1", "2"],
    predictions: ["3", "4"],
    extremeLength: undefined,
    partialSyntax: ["missing_obj", "missing_subj"],
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    uncertain: undefined,
    dataActions: ["remove", "relabel"],
    outcomes: ["CorrectAndPredicted", "IncorrectAndRejected"],
    utterance: undefined,
  });

  expect(parseSearchString("predictions=3").filters).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    labels: undefined,
    predictions: ["3"],
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    uncertain: undefined,
    dataActions: undefined,
    outcomes: undefined,
    utterance: undefined,
  });

  expect(parseSearchString("confidenceMin=0").filters).toStrictEqual({
    confidenceMin: 0,
    confidenceMax: undefined,
    labels: undefined,
    predictions: undefined,
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    uncertain: undefined,
    dataActions: undefined,
    outcomes: undefined,
    utterance: undefined,
  });
});

test("constructSearchString", () => {
  expect(constructSearchString({})).toBe("");
  expect(constructSearchString({ outcomes: [] })).toBe("");
  expect(
    constructSearchString({
      confidenceMin: undefined,
      confidenceMax: undefined,
      labels: undefined,
      predictions: undefined,
      partialSyntax: undefined,
      dataActions: undefined,
      outcomes: undefined,
      utterance: undefined,
    })
  ).toBe("");
  expect(
    constructSearchString({
      confidenceMin: 0.4,
      confidenceMax: 0.6,
      labels: ["1", "2"],
      predictions: ["3", "4"],
      partialSyntax: ["missing_obj", "missing_subj"],
      dataActions: ["remove", "relabel"],
      outcomes: ["CorrectAndPredicted", "IncorrectAndRejected"],
      utterance: undefined,
    })
  ).toBe(
    "?confidenceMin=0.4&confidenceMax=0.6&labels=1,2&predictions=3,4&partialSyntax=missing_obj,missing_subj&dataActions=remove,relabel&outcomes=CorrectAndPredicted,IncorrectAndRejected"
  );
  expect(
    constructSearchString({
      predictions: ["3"],
    })
  ).toBe("?predictions=3");
});

describe("constructApiSearchString", () => {
  it("with no parameters > returns empty string (not even a '?')", () => {
    expect(constructApiSearchString({})).toBe("");
  });

  it("ignores empty arrays", () => {
    expect(constructApiSearchString({ outcomes: [] })).toBe("");
  });

  it("supports numbers", () => {
    expect(
      constructApiSearchString({
        pipelineIndex: 1,
        limit: 10,
        offset: 0,
      })
    ).toBe("?pipelineIndex=1&limit=10&offset=0");
  });

  it("ignores undefined", () => {
    expect(
      constructApiSearchString({
        sort: "label",
        descending: undefined,
      })
    ).toBe("?sort=label");
  });

  it("supports booleans", () => {
    expect(
      constructApiSearchString({
        sort: "label",
        descending: true,
      })
    ).toBe("?sort=label&descending=true");
  });

  it("supports strings", () => {
    expect(
      constructApiSearchString({
        utterance: "freeze",
      })
    ).toBe("?utterance=freeze");
  });

  it("supports arrays", () => {
    expect(
      constructApiSearchString({
        pipelineIndex: 1,
        confidenceMin: 0.4,
        confidenceMax: 0.6,
        labels: ["class1", "class2"],
        predictions: ["class2", "class3"],
        partialSyntax: ["missing_subj", "missing_obj"],
        dataActions: ["remove", "relabel"],
        outcomes: ["CorrectAndPredicted", "IncorrectAndRejected"],
      })
    ).toBe(
      "?pipelineIndex=1&confidenceMin=0.4&confidenceMax=0.6&labels=class1&labels=class2&predictions=class2&predictions=class3&partialSyntax=missing_subj&partialSyntax=missing_obj&dataActions=remove&dataActions=relabel&outcomes=CorrectAndPredicted&outcomes=IncorrectAndRejected"
    );
  });
});
