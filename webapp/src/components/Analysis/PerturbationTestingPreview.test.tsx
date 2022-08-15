import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingPreview from "./PerturbationTestingPreview";
import { AvailableDatasetSplits } from "types/api";
import { setupServer } from "msw/node";
import {
  getPertubationResponse,
  getPertubationResponseWithoutTrainFailureRate,
  getPertubationResponseWithFailureResponse,
} from "mocks/api/mockPertubationAPI";
import { formatRatioAsPercentageString } from "utils/format";

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

  it("should be having two toggle buttons for the train and test", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      expect(screen.getAllByRole("button")).toHaveLength(2);
      expect(screen.getAllByRole("button")).not.toHaveLength(1);
    });
  });

  it("should be having a disabled toggle button if either one of the datasplit is unavailable", async () => {
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

      // selected toggle should be highlighted with some bgcolor
      expect(screen.getByRole("button", { pressed: true })).toHaveStyle(
        "color: rgb(156, 39, 176)"
      );

      // verify with some random unexpected values to not have been displayed.
      expect(screen.queryByText(/17.0%/i)).toBeNull();
      expect(screen.queryByText("some random text")).toBeNull();
      expect(screen.queryByText(/26.0%/i)).toBeNull();
    });
  });

  it("should not display value if a datasplit is not available", async () => {
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
    // verify if all the required columns are displayed
    waitFor(() =>
      table_columns.forEach((name) => {
        expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
      })
    );
  });

  it("should have default sort as desc for colum header 'FR on Evaluation/Training set'", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: "FR on Evaluation Set" })
          .ariaSort
      ).toBe("descending");
      expect(
        screen.getByRole("columnheader", { name: "FR on Evaluation Set" })
          .ariaSort
      ).not.toBe("ascending");
    });
  });

  it("should verify the perturbation preview table displayed with tooltips for column headers 3 and 5", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      // verify if the tooltips are displayed on hovering the columns
      const fr_column = screen.getByRole("columnheader", {
        name: "Modif. Type",
      });
      fireEvent.mouseOver(fr_column);
      waitFor(() =>
        expect(screen.getByText("Modification Type")).toBeVisible()
      );

      fireEvent.mouseOver(
        screen.getByRole("columnheader", {
          name: "FR on Evaluation Set",
        })
      );
      waitFor(() =>
        expect(screen.getByText("Failure Rate on Evaluation Set")).toBeVisible()
      );
    });
  });

  it("should modify the last Column 'Failure Rate' if the toggle is changed to train/eval", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    waitFor(() => {
      // before toggle changes
      expect(
        screen.getByRole("columnheader", {
          name: "FR on Evaluation Set",
        })
      ).toBeInTheDocument();
      // after toggle changes
      fireEvent.click(screen.getByRole("button", { pressed: false }));
      waitFor(() => {
        const fr_column = screen.getByRole("columnheader", {
          name: "FR on Training Set",
        });
        expect(fr_column).toBeInTheDocument();
        fireEvent.mouseOver(fr_column);
        waitFor(() =>
          expect(screen.getByText("Failure Rate on Training Set")).toBeVisible()
        );
      });
    });
  });

  it("should verify the tooltip and formatted value that get displayed for FR column data", async () => {
    renderPerturbationTestingPreview({ train: true, eval: true });
    await waitFor(() => {
      // verify if the tooltip is displayed to FR column data on hovering it
      const fr_column = screen
        .getAllByRole("row")
        .filter((row) => row.ariaRowIndex === "2")
        .find((cell) => cell.ariaColIndex === "5");
      fr_column &&
        waitFor(() => {
          expect(fr_column.ariaLabel).toEqual(
            "Average Confidence Delta: 6.90%"
          );
        });

      // verify the FR data displayed as expected format.
      const test_data = {
        allTestsSummary: [
          {
            name: "Typos",
            description: "Replace characters in the utterance to create typos.",
            family: "Fuzzy Matching",
            perturbationType: "Replacement",
            evalFailureRate: 0.30434782608695654,
            evalCount: 23,
            evalFailedCount: 7,
            evalConfidenceDelta: 0.069,
            trainFailureRate: 0.17647058823529413,
            trainCount: 17,
            trainFailedCount: 3,
            trainConfidenceDelta: 0.08399999999999999,
            example: {
              utterance: "i need my bank account frozen",
              perturbedUtterance: "i need my bank acDount frozen",
            },
          },
        ],
      };
      fr_column &&
        test_data.allTestsSummary.map((test) => {
          expect(fr_column.textContent).toContain(
            `${formatRatioAsPercentageString(test.evalFailureRate, 1)}(${
              test.evalFailedCount
            } out of ${test.evalCount})`
          );
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
