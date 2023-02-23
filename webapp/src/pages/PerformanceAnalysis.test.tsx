import { screen } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerformanceAnalysis from "./PerformanceAnalysis";
import { setupServer } from "msw/node";
import { getDatasetInfoAPIResponse } from "mocks/api/mockDatasetInfoAPI";
import { PIPELINE_REQUIRED_TIP } from "utils/const";

describe("PerformanceAnalysisComparisonWithoutPipeline", () => {
  const handlers = [getDatasetInfoAPIResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should display 'pipeline required' message if no pipeline selected or exist in the config", () => {
    renderWithRouterAndRedux(<PerformanceAnalysis />, {
      route: "/local/dataset_splits/eval/pipeline_metrics",
      path: "/:jobId/dataset_splits/:datasetSplitName/pipeline_metrics",
    });
    expect(screen.getByText(PIPELINE_REQUIRED_TIP)).toBeVisible();
    expect(
      screen.getByText("Pipeline Metrics by Data Subpopulation")
    ).toBeVisible();
    expect(
      screen.getByText("Analyze metrics for different data subpopulations.")
    ).toBeVisible();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://servicenow.github.io/azimuth/main/user-guide/pipeline-metrics-comparison/"
    );
    screen.getByText("Learn more");
    screen.getByTestId("OpenInNewIcon");
  });
});
