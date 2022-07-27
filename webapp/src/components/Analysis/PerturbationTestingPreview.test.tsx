import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingPreview from "./PerturbationTestingPreview";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import { getPertubationResponse } from "mocks/api/mockPertubationAPI";

const renderPerturbationTestingPreview = (
  availableDatasetSplits: AvailableDatasetSplits
) =>
  renderWithRouterAndRedux(
    <PerturbationTestingPreview
      jobId="local"
      pipeline={{ pipelineIndex: 0 }}
      availableDatasetSplits={availableDatasetSplits}
    />,
    { route: "/local?pipeline_index=0", path: "/:jobId?:pipeline" }
  );

describe("Pertubation API", () => {
  const handlers = [getPertubationResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should be having two toggle buttons for train and test", () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  test("should be having disabled toggle buttons if either one datasplit available", () => {
    renderPerturbationTestingPreview({ train: true, eval: false });
    expect(screen.queryByRole("button", { pressed: true })).toHaveClass(
      "Mui-disabled"
    );
  });

  test("should display the data in the expected styling (color, font), format, onchange", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      expect(screen.queryByText(/14.0%/i)).toBeInTheDocument();
      expect(
        screen.queryByText("Failure rate - Evaluation Set")
      ).toBeInTheDocument();
      expect(screen.queryByText(/16.0%/i)).toBeInTheDocument();
      expect(
        screen.queryByText("Failure rate - Training Set")
      ).toBeInTheDocument();

      // styling should be applied for the selected toggle
      expect(screen.getByRole("button", { pressed: true })).toHaveStyle(
        "color: rgb(156, 39, 176)"
      );
    });
  });

  test("should not display data if datasplit not available", async () => {
    renderPerturbationTestingPreview({ train: true, eval: false });
    waitFor(() => {
      expect(screen.queryByText("--%")).toBeInTheDocument();
      expect(screen.getByRole("button", { pressed: true })).toHaveStyle(
        "color: rgb(156, 39, 176)"
      );
    });
  });

  test("should verify the table", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      const table_columns = [
        "Test Family",
        "Test Name",
        "Modif. Type",
        "Test Description",
        "FR on Evaluation Set",
      ];
      const columheaders = screen.queryAllByRole("columnheader");
      // verify all the columns are displayed
      columheaders.forEach((item, index) => {
        expect(item.textContent).toBe(table_columns[index]);
      });

      // check if the column "FR on Evaluation Set" is set to desc by default
      expect(columheaders[5].ariaSort).toEqual("descending");

      // verify if the tooltips are displayed
      fireEvent.mouseOver(columheaders[3]);
      expect(screen.findByText("Modification Type")).toBeInTheDocument();
      fireEvent.mouseOver(columheaders[5]);
      expect(
        screen.findByText("Failure Rate on Evaluation Set")
      ).toBeInTheDocument();

      // Last Column "Failure Rate" should change the header/field if the toggle is changed
      fireEvent.click(screen.getByRole("button", { pressed: false }));
      expect(screen.getByRole("button", { pressed: true })).toHaveStyle(
        "color: rgb(156, 39, 176)"
      );
      expect(columheaders[5].ariaLabel).toEqual("Failure Rate on Training Set");

      // verify if the FR column data is displayed as expected with tooltip
      const firstRow = screen.queryAllByRole("row");
      const cells = within(firstRow[2]).queryAllByRole("cell");
      expect(cells[5].textContent).toEqual("30.4% (7 out of 23)");

      // Verify if the tooltip is displayed for the row data for Failure rate column
      fireEvent.mouseOver(cells[5]);
      expect(cells[5].ariaLabel).toEqual("Average Confidence Delta: 6.90%");
    });
  });
});
