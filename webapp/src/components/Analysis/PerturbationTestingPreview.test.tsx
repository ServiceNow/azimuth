import { screen, waitFor } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingPreview from "./PerturbationTestingPreview";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import {
  getPertubationResponse,
  getPertubationResponseWithoutTrainFailureRate,
  getPertubationResponseWithFailureResponse,
} from "mocks/api/mockPertubationAPI";

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

describe("PerturbationTestingPreview", () => {
  const handlers = [getPertubationResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should have two toggle buttons for the train and test", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });
  });

  it("should have a disabled toggle button if either one of the datasplit is unavailable", async () => {
    renderPerturbationTestingPreview({ train: false, eval: true });
    await waitFor(() => {
      //Verifying if the train toggle button is disabled if not available in datasplits
      expect(screen.getByRole("button", { pressed: false })).toHaveClass(
        "Mui-disabled"
      );
      // By default, evaluation toggle is selected on page load.
      expect(screen.getByRole("button", { pressed: true })).not.toHaveClass(
        "Mui-disabled"
      );
    });
  });

  it("should display the data in the toggle with expected styling (color, font), format", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      // Verrify if the actual response data from API is visibly displayed on the toggle
      expect(screen.getByText(/14.0%/i)).toBeVisible();
      expect(screen.getByText("Failure rate - Evaluation Set")).toBeVisible();
      expect(screen.getByText(/16.0%/i)).toBeVisible();
      expect(screen.getByText("Failure rate - Training Set")).toBeVisible();

      // styling should be applied for the selected toggle as expected
      expect(screen.getByText(/14.0%/)).toHaveStyle(
        "font-size: 3.75rem; color: rgb(237, 108, 2)"
      );

      // verify with some random unexpected values to not have been displayed.
      expect(screen.queryByText(/17.0%/i)).toBeNull();
      expect(screen.queryByText("some random text")).toBeNull();
      expect(screen.queryByText(/26.0%/i)).toBeNull();
    });
  });

  it("should not display a value if datasplit is not available", async () => {
    renderPerturbationTestingPreview({ train: false, eval: true });
    await waitFor(() => expect(screen.getByText("--%")).toBeVisible());
  });

  it("should have expected columns", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    const table_columns = [
      "Test Family",
      "Test Name",
      "Modif. Type",
      "Test Description",
      "FR on Evaluation Set",
    ];
    const columnheaders = screen.getAllByRole("columnheader");
    await waitFor(() => {
      table_columns.forEach((name, index) => {
        expect(columnheaders[index].textContent).toEqual(name);
      });
    });
  });
});

describe("PerturbationTestingPreview without failure rate for training set", () => {
  const handlers = [getPertubationResponseWithoutTrainFailureRate];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("should not display value if failure rate for a datasplit is not available", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      // --% percentage is expected to be shown if failure rate for one of the datasplit is unavailable
      expect(screen.getByText("--%")).toBeVisible();
      // should have a success color if the failure rate is not present for the datasplit
      expect(screen.getByText("--%")).toHaveStyle("color: rgb(46, 125, 50)");
    });
  });
});

describe("PerturbationTestingPreview with Failure response", () => {
  const handlers = [getPertubationResponseWithFailureResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("should be expected to display error message if API fails", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      // expected error message
      expect(
        screen.queryByText(
          "Something went wrong fetching behavioral testing summary"
        )
      ).toBeTruthy();
      // some random message
      expect(
        screen.queryByText("Error message not defined in the code")
      ).toBeNull();
    });
  });
});
