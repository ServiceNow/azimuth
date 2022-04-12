import { formatRatioAsPercentageString } from "utils/format";

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
