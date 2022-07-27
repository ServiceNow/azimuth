import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingPreview from "./PerturbationTestingPreview";
import { AvailableDatasetSplits, PerturbationTestingSummary } from "types/api";
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
    await waitFor(() => {
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
    await waitFor(() => {
      expect(screen.queryByText("--%")).toBeInTheDocument();
      expect(screen.getByRole("button", { pressed: true })).toHaveStyle(
        "color: rgb(156, 39, 176)"
      );
    });
  });
});
