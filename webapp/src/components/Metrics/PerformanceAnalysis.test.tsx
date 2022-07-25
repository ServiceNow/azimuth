import {
  fireEvent,
  queryByText,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import { setupServer } from "msw/node";
// import { getConfig } from "mocks/api/mockConfigAPI";
import { getMetricsPerFilterWithEval } from "mocks/api/mockMetricsAPI";
import PerformanceAnalysis from "./PerformanceAnalysis";

const renderPerformanceAnalysis = () =>
  renderWithRouterAndRedux(
    <PerformanceAnalysis jobId="local" pipeline={{ pipelineIndex: 0 }} />,
    { route: "/local", path: "/:jobId" }
  );

// describe("config API", () => {
//   const handlers = [getConfig];
//   const server = setupServer(...handlers);

//   beforeAll(() => server.listen());
//   afterEach(() => server.resetHandlers());
//   afterAll(() => server.close());
// });

describe("MetricsPerFilterWithEval API", () => {
  const evalHandlers = [getMetricsPerFilterWithEval];
  const server = setupServer(...evalHandlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  //DataSplit Toggler

  test("shoud have 2 toggle buttons displayed and enabled with icons", () => {
    renderPerformanceAnalysis();
    expect(screen.queryByText("Evaluation Set")).toBeInTheDocument();
    expect(within(screen.getByText("Evaluation Set")).findByRole("SpeedIcon"));
    expect(screen.queryByText("Training Set")).toBeInTheDocument();
    expect(
      within(screen.getByText("Training Set")).findByRole("ModelTrainingIcon")
    );
  });

  test("should test the number of columns displayed", () => {
    renderPerformanceAnalysis();
    const row = screen.getAllByRole("row")[0];
    const column = within(row).findAllByRole("columnheader");
    waitFor(() => {
      expect(column).toHaveLength(10);
    });
  });

  test("should test all columns", () => {
    const table_columns = [
      "filterValue",
      "utteranceCount",
      "CorrectAndPredicted",
      "CorrectAndRejected",
      "IncorrectAndRejected",
      "IncorrectAndPredicted",
      "Precision",
      "Recall",
      "F1",
      "ece",
    ];
    const list_item = [
      "label",
      "prediction",
      "extremeLength",
      "partialSyntax",
      "dissimilar",
      "almostCorrect",
      "behavioralTesting",
      "pipelineComparison",
      "uncertain",
    ];
    renderPerformanceAnalysis();
    const row = screen.getAllByRole("row")[0];
    const columns = row.firstChild;
    waitFor(() => {
      // check the list of columns present
      columns?.childNodes.forEach((item, index) => {
        expect(item.textContent).toBe(table_columns[index]);
      });

      // verify the  "Label" column
      const filterColumn = columns?.firstChild;
      expect(filterColumn).toHaveDisplayValue("Label");

      // verify the length of the list
      const list = screen.getByRole("listitem");
      expect(list).toHaveAttribute("expanded", false);
      fireEvent.click(list);
      expect(list).toHaveAttribute("expanded", true);
      expect(list).toHaveLength(9);

      //verify the list items
      const listitem = screen.getAllByRole("listitem");
      listitem.forEach((item, index) => {
        expect(item.textContent).toBe(list_item[index]);
      });

      // verify the diplay of selected list item
      fireEvent.change(list, { target: { value: "prediction" } });
      expect(filterColumn).toHaveDisplayValue("Prediction");

      //verify the display of icons and hover functionality
      const checkIcon = screen.getAllByTestId("CheckIcon");
      const xIcon = screen.getAllByTestId("XIcon");
      expect(checkIcon).toBeVisible();
      expect(xIcon).toBeVisible();
      fireEvent.mouseOver(checkIcon[0]);
      expect(screen.findByText("Correct & Predicted")).toBeVisible();
      fireEvent.mouseOver(checkIcon[1]);
      expect(screen.findByText("Correct & Rejected")).toBeVisible();
      fireEvent.mouseOver(xIcon[0]);
      expect(screen.findByText("Incorrect & Predicted")).toBeVisible();
      fireEvent.mouseOver(xIcon[1]);
      expect(screen.findByText("Incorrect & Rejected")).toBeVisible();
    });
  });
});
