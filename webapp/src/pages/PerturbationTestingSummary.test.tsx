import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import PerturbationTestingSummary from "./PerturbationTestingSummary";
import { setupServer } from "msw/node";
import {
  getPertubationResponse,
  //   downloadPerturbationTestingSummary,
  //   downloadPerturbedUtterances,
} from "mocks/api/mockPertubationAPI";

import {
  downloadPerturbedSet,
  downloadPerturbationTestingSummary,
} from "utils/api";

const downloadBlob = (blob: Blob, filename?: string) => {
  const downloadUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  if (filename) {
    link.setAttribute("download", filename);
  }
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(downloadUrl);
};

const renderPerturbationTestingSummaryWithPipeline = () =>
  renderWithRouterAndRedux(<PerturbationTestingSummary />, {
    route: "/local?pipeline_index=0",
    path: "/:jobId?:pipeline",
  });

const renderPerturbationTestingSummaryWithoutPipeline = () =>
  renderWithRouterAndRedux(<PerturbationTestingSummary />, {
    route: "/local",
    path: "/:jobId",
  });

describe("DatasetInfo API", () => {
  const handlers = [getPertubationResponse];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should display title and description", () => {
    renderPerturbationTestingSummaryWithPipeline();
    expect(
      screen.queryByText("Behavioral Testing Summary")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Assess if your model is robust to small modifications."
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId("LinkIcon")).toBeInTheDocument();
    expect(screen.queryByText("Learn more")).toBeInTheDocument();
    const link: HTMLAnchorElement = screen.getByRole("link");
    expect(link.href).toContain(
      "https://servicenow.github.io/azimuth/user-guide/behavioral-testing-summary/"
    );
  });

  test("should not display table but display a message if no pipeline is selected", () => {
    renderPerturbationTestingSummaryWithoutPipeline();
    expect(
      screen.queryByText("Unavailable without a pipeline")
    ).toBeInTheDocument();
  });

  test("should display the table", async () => {
    renderPerturbationTestingSummaryWithPipeline();
    waitFor(() => {
      const table_columns = [
        "Test Family",
        "Test Name",
        "Modif. Type",
        "Test Description",
        "FR on Evaluation Set",
        "FR on Training Set",
        "Example",
      ];
      const columheaders = screen.queryAllByRole("columnheader");
      // verify all the columns are displayed
      columheaders.forEach((item, index) => {
        expect(item.textContent).toBe(table_columns[index]);
      });

      // verify if the tooltips are displayed
      fireEvent.mouseOver(columheaders[3]);
      expect(screen.findByText("Modification Type")).toBeInTheDocument();
      fireEvent.mouseOver(columheaders[5]);
      expect(
        screen.findByText("Failure Rate on Evaluation Set")
      ).toBeInTheDocument();
      fireEvent.mouseOver(columheaders[6]);
      expect(
        screen.findByText("Failure Rate on Training Set")
      ).toBeInTheDocument();

      // verify if the FR column data is displayed as expected with tooltip
      const firstRow = screen.queryAllByRole("row");
      const cells = within(firstRow[4]).queryAllByRole("cell");
      expect(cells[5].textContent).toEqual("16.3% (15 out of 92)");
      expect(cells[6].textContent).toEqual("14.7% (10 out of 68)");
      expect(cells[7].textContent).toContain(/-/i);
      expect(cells[7].textContent).toContain(/+/i);
      expect(cells[7].textContent).toContain(
        /-i need my bank account frozen +i need my bank account frozen pls/i
      );
    });
  });

  test("should display export button with menu items", async () => {
    renderPerturbationTestingSummaryWithPipeline();

    // verify if the button displayed with name and start/end icons
    const exportButton = screen.getByRole("button");
    expect(exportButton).toBeDefined();
    expect(screen.queryByText("Export")).toBeInTheDocument();
    expect(screen.queryByTestId("GetAppIcon")).toBeInTheDocument();
    expect(screen.queryByTestId("ArrowDropDownIcon")).toBeInTheDocument();

    // verify if the menu items displayed with expected lists onclick of export button
    fireEvent.click(exportButton);
    waitFor(() => {
      expect(screen.findByRole("menu")).toBeDefined();
      const menulists = [
        "Export behavioral testing summary",
        "Export modified evaluation set",
        "Export modified training set",
      ];
      const menuItems = screen.queryAllByRole("menuitem");
      menuItems.forEach((item, index) => {
        expect(item.textContent).toBe(menulists[index]);
      });
    });
  });
});
