import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingPreview from "./PerturbationTestingPreview";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import {
  getPerturbationResponse,
  getPerturbationResponseWithoutTrainFailureRate,
  getPerturbationResponseWithFailureResponse,
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
  const handlers = [getPerturbationResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should have two toggle buttons for the train and test", () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("should disable the toggle button if either one of the dataset splits is unavailable", () => {
    renderPerturbationTestingPreview({ train: false, eval: true });
    // Verifying if the train toggle button is disabled if not available in dataset splits
    expect(screen.getByRole("button", { pressed: false })).toHaveClass(
      "Mui-disabled"
    );
    // By default, evaluation toggle is selected on page load.
    expect(screen.getByRole("button", { pressed: true })).not.toHaveClass(
      "Mui-disabled"
    );
  });

  it("should display the data in the toggle with expected styling (color, font), format", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      // Verify if the actual response data from API is visibly displayed on the toggle
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

  it("should display '--%' if dataset splits is not available", async () => {
    renderPerturbationTestingPreview({ train: false, eval: true });
    await waitFor(() => expect(screen.getByText("--%")).toBeVisible());
  });

  it("should have expected columns", () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    const expectedColumnHeaders = [
      "Test Family",
      "Test Name",
      "Modif. Type",
      "Test Description",
      "FR on Evaluation Set",
    ];
    const actualColumnHeaders = screen.getAllByRole("columnheader");
    expectedColumnHeaders.forEach((name, index) => {
      expect(actualColumnHeaders[index].textContent).toEqual(name);
    });
  });

  it("should have default sort as desc for colum header 'FR on Evaluation/Training set'", () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    const header = screen.getByRole("columnheader", { name: /Failure Rate/ });
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("should modify the last Column 'Failure Rate' and tooltips of it if the toggle is changed to train/eval", () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    const header = screen.getByRole("columnheader", { name: /Failure Rate/ });
    // before toggle changes
    expect(header).toHaveTextContent("Evaluation Set");
    expect(
      screen.getByLabelText("Failure Rate on Evaluation Set")
    ).toBeInTheDocument();
    // after toggle changes
    fireEvent.click(screen.getByRole("button", { pressed: false }));
    expect(header).toHaveTextContent("Training Set");
    expect(
      screen.getByLabelText("Failure Rate on Training Set")
    ).toBeInTheDocument();
  });
});

describe("PerturbationTestingPreview without failure rate for training set", () => {
  const handlers = [getPerturbationResponseWithoutTrainFailureRate];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("should not display value if failure rate for a dataset splits is not available", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      // --% percentage is expected to be shown if failure rate for one of the dataset splits is unavailable
      expect(screen.getByText("--%")).toBeVisible();
    });
  });
});

describe("PerturbationTestingPreview with Failure response", () => {
  const handlers = [getPerturbationResponseWithFailureResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  it("should display the error message if API fails", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      // expected error message
      expect(
        screen.getByText(
          "Something went wrong fetching behavioral testing summary"
        )
      ).toBeTruthy();
    });
  });
});
