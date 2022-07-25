import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouterAndRedux } from "mocks/utils";
import { DatasetSplitName } from "types/api";
import DatasetSplitToggler from "./DatasetSplitToggler";
import { setupServer } from "msw/node";
import {
  getDatasetInfo,
  getDatasetInfoWithoutEvaluationSplit,
  getDatasetInfoWithoutTrainSplit,
} from "mocks/api/mockDatasetInfoAPI";

const onChangeMock = (value: DatasetSplitName) => jest.fn();
const renderDataSplitToggler = (value: DatasetSplitName) =>
  renderWithRouterAndRedux(
    <DatasetSplitToggler value={value} onChange={onChangeMock} />,
    { route: "/local", path: "/:jobId" }
  );

describe("DatasetInfo API", () => {
  const handlers = [getDatasetInfo];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("shoud have 2 toggle buttons displayed and enabled with icons", () => {
    renderDataSplitToggler("eval");
    expect(screen.queryAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText("Evaluation Set")).toBeInTheDocument();
    expect(screen.queryByTestId("SpeedIcon")).toBeInTheDocument();
    expect(screen.queryByText("Training Set")).toBeInTheDocument();
    expect(screen.queryByTestId("ModelTrainingIcon")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Evaluation/i })[0]
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("should the toggle button Evaluation set displayed with SpeedIcon", () => {
    renderDataSplitToggler("eval");
    expect(within(screen.getByText("Evaluation Set")).findByRole("SpeedIcon"));
  });

  test("should the toggle button Training set displayed with ModelTrainingIcon", () => {
    renderDataSplitToggler("eval");
    expect(
      within(screen.getByText("Training Set")).findByRole("ModelTrainingIcon")
    );
  });
  test("should be able to test onchange updates the value property", () => {
    renderDataSplitToggler("train");
    const buttonEl = screen.getByRole("button", { name: /Training/i });
    expect(buttonEl).toBeInTheDocument();
    expect(buttonEl).toBeDisabled();
    fireEvent.click(buttonEl, {
      target: {
        value: "train",
      },
    });
    expect(screen.getAllByRole("button", { name: /Training/i })[0]).toHaveClass(
      "Mui-selected"
    );
  });
});

describe("DatasetInfo API without Training split", () => {
  const handlers = [getDatasetInfoWithoutTrainSplit];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("shoud have training set toggle button disabled", () => {
    renderDataSplitToggler("eval");
    expect(screen.queryAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText("Training Set")).toBeDisabled();
  });
});

describe("DatasetInfo API without Evaluation split", () => {
  const handlers = [getDatasetInfoWithoutEvaluationSplit];
  const server = setupServer(...handlers);

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("shoud have toggle buttons displayed with icons", () => {
    renderDataSplitToggler("train");
    expect(screen.queryAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText("Evaluation Set")).toBeDisabled();
  });
});
