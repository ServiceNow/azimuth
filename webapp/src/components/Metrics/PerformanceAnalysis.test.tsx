import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerformanceAnalysis from "./PerformanceAnalysis";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import {
  getCustomMetricInfoAPIResponse,
  getMetricsPerFilterAPIResponse,
  getMetricsPerFilterAPIWithFailureResponse,
} from "mocks/api/mockMetricsAPI";

const setDatasetSplitName = jest.fn();
const renderPerformanceAnalysis = (
  availableDatasetSplits: AvailableDatasetSplits
) =>
  renderWithRouterAndRedux(
    <PerformanceAnalysis
      jobId="local"
      pipeline={{ pipelineIndex: 0 }}
      availableDatasetSplits={availableDatasetSplits}
      datasetSplitName="eval"
      setDatasetSplitName={setDatasetSplitName}
    />,
    { route: "/local?pipeline_index=0", path: "/:jobId?:pipeline" }
  );
describe("PerturbationTestingPreview", () => {
  const handlers = [
    getCustomMetricInfoAPIResponse,
    getMetricsPerFilterAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should have two toggle buttons for the train and test", () => {
    renderPerformanceAnalysis({ train: true, eval: true });
    // verify if the toggles displayed with correct names
    expect(
      screen.getByRole("button", { name: "Evaluation Set", pressed: true })
    ).toHaveValue("eval");
    expect(
      screen.getByRole("button", { name: "Training Set", pressed: false })
    ).toHaveValue("train");
  });
});
