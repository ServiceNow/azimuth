import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerformanceAnalysisTable from "./PerformanceAnalysisTable";
import { AvailableDatasetSplits, DatasetSplitName } from "types/api";
import { setupServer } from "msw/node";
import {
  getCustomMetricInfoAPIResponse,
  getMetricsPerFilterAPIResponse,
  getMetricsPerFilterAPIWithFailureResponse,
} from "mocks/api/mockMetricsAPI";
import { getConfigAPIResponse } from "mocks/api/mockConfigAPI";
import { QueryPipelineState } from "types/models";

const setDatasetSplitName = jest.fn();
const renderPerformanceAnalysisTable = (
  availableDatasetSplits: AvailableDatasetSplits,
  datasetSplitName: DatasetSplitName,
  pipeline: Required<QueryPipelineState>
) =>
  renderWithRouterAndRedux(
    <PerformanceAnalysisTable
      jobId="local"
      pipeline={pipeline} //{{ pipelineIndex: 0 }}
      availableDatasetSplits={availableDatasetSplits}
      isLoading={false}
      datasetSplitName={datasetSplitName}
      setDatasetSplitName={setDatasetSplitName}
    />,
    { route: "/local?pipeline_index=0", path: "/:jobId?:pipeline" }
  );

describe("PerformanceAnalysisComparisonTable", () => {
  const handlers = [
    getConfigAPIResponse,
    getCustomMetricInfoAPIResponse,
    getMetricsPerFilterAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
});
