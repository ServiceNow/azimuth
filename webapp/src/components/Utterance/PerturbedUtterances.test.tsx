import { perturbedUtterancesColumns } from "./PerturbedUtterances";

const TABLE_WIDTH_VIEWED_ON_MACBOOK_PRO_16 = 1678;

describe("perturbedUtterancesColumns", () => {
  it("should each have a width xor have a minWidth and a flex", () => {
    expect(
      perturbedUtterancesColumns.find(
        ({ flex, minWidth, width }) =>
          !((flex && minWidth && !width) || (!flex && !minWidth && width))
      )
    ).toBeUndefined();
  });
  it(`should have their (width || minWidth) sum to ${TABLE_WIDTH_VIEWED_ON_MACBOOK_PRO_16}`, () => {
    const minWidths = perturbedUtterancesColumns.map(
      ({ width, minWidth }) => (width || minWidth) as number
    );
    expect(minWidths.reduce((a, b) => a + b)).toBe(
      TABLE_WIDTH_VIEWED_ON_MACBOOK_PRO_16
    );
  });
});
