import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
describe("PerformanceAnalysis", () => {
  const handlers = [
    getCustomMetricInfoAPIResponse,
    getMetricsPerFilterAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should display two toggle buttons for the train and test", () => {
    renderPerformanceAnalysis({ train: true, eval: true });
    // verify if the toggles displayed with correct names
    expect(
      screen.getByRole("button", { name: "Evaluation Set", pressed: true })
    ).toHaveValue("eval");
    expect(
      screen.getByRole("button", { name: "Training Set", pressed: false })
    ).toHaveValue("train");
  });

  it("should display the expected columns", async () => {
    renderPerformanceAnalysis({ train: true, eval: true });
    await waitFor(() => {
      const expectedColumnHeaders = [
        "Label",
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
    renderPerformanceAnalysis({ train: true, eval: true });
    const header = screen.getByRole("columnheader", { name: /Total/ });
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("should display the list of options if the user click on the column header 'filterValue'", () => {
    renderPerformanceAnalysis({ train: true, eval: true });
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

    expect(screen.getByRole("option", { name: "Prediction" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    fireEvent.click(screen.getByRole("option", { name: "Prediction" }));
    expect(
      screen.getByRole("columnheader", { name: "Prediction" })
    ).toBeInTheDocument();
  });

  it("should not display the Footer component if the number of rows is lesser than initial number", async () => {
    renderPerformanceAnalysis({ train: true, eval: true });
    await waitFor(() => expect(screen.queryByText(/See more/)).toBeNull());
  });
});

describe("MetricsPerFilterAPIWithFailureResponse", () => {
  const handlers = [
    getMetricsPerFilterAPIWithFailureResponse,
    getCustomMetricInfoAPIResponse,
  ];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("should display the error message if the API fails", async () => {
    renderPerformanceAnalysis({ train: true, eval: true });
    await waitFor(() => {
      // expected error message
      expect(
        screen.getByText(/Something went wrong fetching metrics per filter/i)
      ).toBeVisible();
    });
  });
});
