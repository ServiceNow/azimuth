import {
  parseSearchString,
  constructSearchString,
  constructApiSearchString,
} from "utils/helpers";

test("convertSearchParamsToFilterState", () => {
  expect(parseSearchString("").filters).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    label: undefined,
    prediction: undefined,
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    pipelineComparison: undefined,
    uncertain: undefined,
    dataAction: undefined,
    outcome: undefined,
    utterance: undefined,
  });

  expect(
    parseSearchString(
      "?label=1,2&prediction=3,4&partial_syntax=missing_obj,missing_subj&data_action=remove,relabel&outcome=CorrectAndPredicted,IncorrectAndRejected"
    ).filters
  ).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    label: ["1", "2"],
    prediction: ["3", "4"],
    extremeLength: undefined,
    partialSyntax: ["missing_obj", "missing_subj"],
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    pipelineComparison: undefined,
    uncertain: undefined,
    dataAction: ["remove", "relabel"],
    outcome: ["CorrectAndPredicted", "IncorrectAndRejected"],
    utterance: undefined,
  });

  expect(parseSearchString("prediction=3").filters).toStrictEqual({
    confidenceMin: undefined,
    confidenceMax: undefined,
    label: undefined,
    prediction: ["3"],
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    pipelineComparison: undefined,
    uncertain: undefined,
    dataAction: undefined,
    outcome: undefined,
    utterance: undefined,
  });

  expect(parseSearchString("confidence_min=0").filters).toStrictEqual({
    confidenceMin: 0,
    confidenceMax: undefined,
    label: undefined,
    prediction: undefined,
    extremeLength: undefined,
    partialSyntax: undefined,
    dissimilar: undefined,
    almostCorrect: undefined,
    behavioralTesting: undefined,
    pipelineComparison: undefined,
    uncertain: undefined,
    dataAction: undefined,
    outcome: undefined,
    utterance: undefined,
  });
});

test("constructSearchString", () => {
  expect(constructSearchString({})).toBe("");
  expect(constructSearchString({ outcome: [] })).toBe("");
  expect(
    constructSearchString({
      confidenceMin: undefined,
      confidenceMax: undefined,
      label: undefined,
      prediction: undefined,
      partialSyntax: undefined,
      dataAction: undefined,
      outcome: undefined,
      utterance: undefined,
    })
  ).toBe("");
  expect(
    constructSearchString({
      confidenceMin: 0.4,
      confidenceMax: 0.6,
      label: ["1", "2"],
      prediction: ["3", "4"],
      partialSyntax: ["missing_obj", "missing_subj"],
      dataAction: ["remove", "relabel"],
      outcome: ["CorrectAndPredicted", "IncorrectAndRejected"],
      utterance: undefined,
    })
  ).toBe(
    "?confidence_min=0.4&confidence_max=0.6&label=1,2&prediction=3,4&partial_syntax=missing_obj,missing_subj&data_action=remove,relabel&outcome=CorrectAndPredicted,IncorrectAndRejected"
  );
  expect(
    constructSearchString({
      prediction: ["3"],
    })
  ).toBe("?prediction=3");
});

describe("constructApiSearchString", () => {
  it("with no parameters > returns empty string (not even a '?')", () => {
    expect(constructApiSearchString({})).toBe("");
  });

  it("ignores empty arrays", () => {
    expect(constructApiSearchString({ outcome: [] })).toBe("");
  });

  it("supports numbers", () => {
    expect(
      constructApiSearchString({
        pipelineIndex: 1,
        limit: 10,
        offset: 0,
      })
    ).toBe("?pipeline_index=1&limit=10&offset=0");
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
        label: ["class1", "class2"],
        prediction: ["class2", "class3"],
        partialSyntax: ["missing_subj", "missing_obj"],
        dataAction: ["remove", "relabel"],
        outcome: ["CorrectAndPredicted", "IncorrectAndRejected"],
      })
    ).toBe(
      "?pipeline_index=1&confidence_min=0.4&confidence_max=0.6&label=class1&label=class2&prediction=class2&prediction=class3&partial_syntax=missing_subj&partial_syntax=missing_obj&data_action=remove&data_action=relabel&outcome=CorrectAndPredicted&outcome=IncorrectAndRejected"
    );
  });
});
