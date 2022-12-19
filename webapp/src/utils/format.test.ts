import {
  camelToTitleCase,
  formatNumberAsString,
  formatRatioAsPercentageString,
} from "utils/format";

test("formatNumberAsString", () => {
  expect(formatNumberAsString(0)).toBe("0.00");
  expect(formatNumberAsString(0.000001)).toBe("0.000001");
  expect(formatNumberAsString(0.0000001)).toBe("1e-7");
  expect(formatNumberAsString(0.01)).toBe("0.01");
  expect(formatNumberAsString(0.0100001)).toBe("0.01");
  expect(formatNumberAsString(0.9899999)).toBe("0.99");
  expect(formatNumberAsString(0.9999999)).toBe("1.00"); // TODO would 0.9999999 be better? That's a bit more complicated.
  expect(formatNumberAsString(1)).toBe("1.00");

  expect(formatNumberAsString(0, 0)).toBe("0");
  expect(formatNumberAsString(0.0001, 0)).toBe("0.0001");
  expect(formatNumberAsString(0.9, 0)).toBe("1");
  expect(formatNumberAsString(1, 0)).toBe("1");
});

test("formatRatioASPercentageString", () => {
  expect(formatRatioAsPercentageString(0)).toBe("0.00%");
  expect(formatRatioAsPercentageString(0.0000001)).toBe("0.00001%");
  expect(formatRatioAsPercentageString(0.01)).toBe("1.00%");
  expect(formatRatioAsPercentageString(0.0100001)).toBe("1.00%");
  expect(formatRatioAsPercentageString(0.9899999)).toBe("99.00%");
  expect(formatRatioAsPercentageString(0.9999999)).toBe("100.00%"); // TODO would 99.99999% be better? That's a bit more complicated.
  expect(formatRatioAsPercentageString(1)).toBe("100.00%");

  expect(formatRatioAsPercentageString(0, 0)).toBe("0%");
  expect(formatRatioAsPercentageString(0.0001, 0)).toBe("0.01%");
  expect(formatRatioAsPercentageString(0.009, 0)).toBe("1%");
  expect(formatRatioAsPercentageString(1, 0)).toBe("100%");
});

describe("camelToTitleCase", () => {
  it("should convert CamelCase to Title Case", () => {
    expect(camelToTitleCase("SimpleCamelCase")).toBe("Simple Camel Case");
  });
  it("should support acronyms", () => {
    expect(camelToTitleCase("FAISSModule")).toBe("FAISS Module");
  });
  it("should support numbers in acronyms", () => {
    expect(camelToTitleCase("B2BCommerce")).toBe("B2B Commerce");
  });
  it("should support numbers at the end of acronyms", () => {
    expect(camelToTitleCase("HDF5Cache")).toBe("HDF5 Cache");
  });
  it("should support numbers at the beginning of acronyms", () => {
    expect(camelToTitleCase("My2FAAuth")).toBe("My 2FA Auth");
  });
  it("should support spaces already there between words", () => {
    expect(camelToTitleCase("Simple Camel Case")).toBe("Simple Camel Case");
  });
  it("should support spaces already there between words and acronyms", () => {
    expect(camelToTitleCase("FAISS Module")).toBe("FAISS Module");
  });
});
