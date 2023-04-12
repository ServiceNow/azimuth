import { screen, waitFor, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import ClassOverlapTable from "./ClassOverlapTable";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import { getClassOverlapAPIResponse } from "mocks/api/mockClassOverlapAPI";
import { QueryPipelineState } from "types/models";

const renderClassOverlapTable = (
  availableDatasetSplits: AvailableDatasetSplits,
  pipeline: QueryPipelineState
) =>
  renderWithRouterAndRedux(
    <ClassOverlapTable
      jobId="local"
      pipeline={pipeline}
      availableDatasetSplits={availableDatasetSplits}
    />,
    { route: "/local?pipeline_index=0", path: "/:jobId?:pipeline" }
  );

describe("ClassOverlapTable", () => {
  const handlers = [getClassOverlapAPIResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should have expected columns", () => {
    renderClassOverlapTable({ train: true, eval: true }, { pipelineIndex: 0 });
    const expectedColumnHeaders = [
      "Source Class",
      "Target Class",
      "Semantic Overlap Score",
      "Pipeline Confusion",
      "Utterances with Overlap",
    ];
    const columnHeaderDescription = [
      "The class label of the samples being analyzed.",
      "The class that the source class may look like. For pipeline confusion, this is the prediction.",
      "Class overlap measures the extent to which source class samples are semantically similar to target class samples, in the training data. The score comes from both the proportion of samples and their degree of similarity.",
      "Pipeline confusion indicates whether source class samples in the evaluation set are predicted to be in the target class.",
      "Percent of source class samples that semantically overlap the target class (all in the training set).",
    ];
    const actualColumnHeaders = screen.getAllByRole("columnheader");
    expectedColumnHeaders.forEach((name, index) => {
      expect(actualColumnHeaders[index].textContent).toEqual(name);
      within(actualColumnHeaders[index]).getByLabelText(
        columnHeaderDescription[index]
      );
    });
  });

  it("should display the default sort as desc for colum header 'Semantic Overlap Score'", () => {
    renderClassOverlapTable({ train: true, eval: true }, { pipelineIndex: 0 });
    const header = screen.getByRole("columnheader", {
      name: /Class overlap/,
    });
    expect(header.textContent).toBe("Semantic Overlap Score");
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("should not display the columns except 'Pipeline Confusion' if no pipeline exist/selected", () => {
    renderClassOverlapTable(
      { train: true, eval: true },
      { pipelineIndex: undefined }
    );
    expect(
      screen.queryByRole("columnheader", { name: /Pipeline confusion/ })
    ).toBeNull();
  });

  it("should not display the Footer component if the number of rows is less than initial number", async () => {
    renderClassOverlapTable({ train: true, eval: true }, { pipelineIndex: 0 });
    await waitFor(() => {
      // Wait for the API data to be loaded before verifying that there is no "See more" button.
      expect(screen.getAllByRole("row")[1]).toHaveClass("MuiDataGrid-row");
    });
    expect(screen.queryByText(/See more/)).toBeNull();
  });
});
