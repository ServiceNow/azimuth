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
import {
  getConfigAPIResponse,
  getConfigMultipipelineAPIResponse,
} from "mocks/api/mockConfigAPI";

const setDatasetSplitName = jest.fn();
const renderPerformanceAnalysisTable = (
  availableDatasetSplits: AvailableDatasetSplits,
  datasetSplitName: DatasetSplitName
) =>
  renderWithRouterAndRedux(
    <PerformanceAnalysisTable
      jobId="local"
      pipeline={{ pipelineIndex: 0 }}
      availableDatasetSplits={availableDatasetSplits}
      isLoading={false}
      datasetSplitName={datasetSplitName}
      setDatasetSplitName={setDatasetSplitName}
    />,
    { route: "/local?pipeline_index=0", path: "/:jobId?:pipeline" }
  );

describe("PerformanceAnalysisComparisonTableWithNoComparedPipeline", () => {
  const handlers = [
    getConfigAPIResponse,
    getCustomMetricInfoAPIResponse,
    getMetricsPerFilterAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should display two toggle buttons for the train and test", () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    // verify if the toggles displayed with correct names
    expect(
      screen.getByRole("button", { name: "Evaluation Set", pressed: true })
    ).toHaveValue("eval");
    expect(
      screen.getByRole("button", { name: "Training Set", pressed: false })
    ).toHaveValue("train");
  });

  it("should display the expected columns", async () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    await waitFor(() => {
      const expectedColumnHeaders = [
        "filterValue",
        "Total",
        "Correct & Predicted",
        "Correct & Rejected",
        "Incorrect & Rejected",
        "Incorrect & Predicted",
        "Accuracy",
        "Precision",
        "Recall",
        "F1",
        "ECE",
      ];
      const actualColumnHeaders = screen.getAllByRole("columnheader");
      expectedColumnHeaders.forEach((name, index) => {
        name.includes("&")
          ? within(actualColumnHeaders[index]).getByLabelText(name)
          : expect(actualColumnHeaders[index].textContent).toBe(name);
      });
    });
  });

  it("should display the default sort as desc for colum header 'Total number of utterances'", () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    const header = screen.getByRole("columnheader", { name: /Total/ });
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("should display the list of options if the user click on the column header 'filterValue'", () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    fireEvent.mouseDown(screen.getByRole("button", { name: "Label" }));
    const filterList = screen.getAllByRole("option");

    const expectedList = [
      "Label",
      "Prediction",
      "Smart Tags",
      "Extreme Length",
      "Partial Syntax",
      "Dissimilar",
      "Almost Correct",
      "Behavioral Testing",
      "Pipeline Comparison",
      "Uncertain",
    ];
    expect(filterList).toHaveLength(expectedList.length);
    filterList.forEach((item, index) => {
      expect(item.textContent).toBe(expectedList[index]);
    });

    expect(screen.getByRole("option", { name: "Smart Tags" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });
});

describe("PerformanceAnalysisComparisonTableWithMultiPipeline", () => {
  const handlers = [
    getConfigMultipipelineAPIResponse,
    getCustomMetricInfoAPIResponse,
    getMetricsPerFilterAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should display pipeline select component if the config has more than one pipeline", async () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    await screen.findByText("Compare Baseline (Pipeline_0) with:");
  });

  it("should display list of pipelines", async () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");

    await waitFor(() => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "No pipeline" }));
      const pipelineList = screen.getAllByRole("option");
      const expectedPipelineList = [
        "No pipeline",
        "Pipeline_0",
        "Pipeline_1",
        "Pipeline_2",
        "Pipeline_3",
      ];
      expect(pipelineList).toHaveLength(expectedPipelineList.length);
      pipelineList.forEach((item, index) => {
        expect(item.textContent).toBe(expectedPipelineList[index]);
      });
      expect(screen.getByRole("option", { name: "Pipeline_0" })).toHaveClass(
        "Mui-disabled"
      );
    });
  });

  it("should display the expected columns", async () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    fireEvent.mouseDown(
      await screen.findByRole("button", { name: "No pipeline" })
    );
    fireEvent.click(await screen.findByRole("option", { name: "Pipeline_1" }));
    await waitFor(() => {
      const expectedColumnHeaders = [
        "filterValue",
        "Total",
        ...[
          "Correct & Predicted",
          "Correct & Rejected",
          "Incorrect & Rejected",
          "Incorrect & Predicted",
          "Accuracy",
          "Precision",
          "Recall",
          "F1",
          "ECE",
        ].flatMap((header) => ["Pipeline_0" + header, "Pipeline_1", "Delta"]),
      ];
      const actualColumnHeaders = screen.getAllByRole("columnheader");
      expectedColumnHeaders.forEach((name, index) => {
        expect(actualColumnHeaders[index].textContent).toBe(name);
      });
    });
  });
});

describe("MetricsPerFilterAPIWithFailureResponse", () => {
  const handlers = [
    getMetricsPerFilterAPIWithFailureResponse,
    getCustomMetricInfoAPIResponse,
    getConfigAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should display the error message if the API fails", async () => {
    renderPerformanceAnalysisTable({ train: true, eval: true }, "eval");
    await waitFor(() => {
      // expected error message
      expect(
        screen.getByText(/Something went wrong fetching metrics per filter/i)
      ).toBeVisible();
    });
  });
});
