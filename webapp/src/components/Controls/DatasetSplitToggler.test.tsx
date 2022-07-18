import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import { DatasetSplitName } from "types/api";
import DatasetSplitToggler from "./DatasetSplitToggler";
import { server } from "../../mocks/server";

const onChangeMock = jest.fn();
const renderDataSplitToggler = (value: DatasetSplitName) =>
  renderWithRouterAndRedux(
    <DatasetSplitToggler value={value} onChange={onChangeMock} />,
    { route: "/local", path: "/:jobId" }
  );

test("shoud have 2 toggle buttons displayed with icons", () => {
  renderDataSplitToggler("eval");
  expect(screen.queryAllByRole("button")).toHaveLength(2);
  expect(screen.queryByText("Evaluation Set")).toBeInTheDocument();
  expect(screen.queryByTestId("SpeedIcon")).toBeInTheDocument();
  expect(screen.queryByText("Training Set")).toBeInTheDocument();
  expect(screen.queryByTestId("ModelTrainingIcon")).toBeInTheDocument();
});

test("should the toggle button Evaluation set displayed with SpeedIcon", async () => {
  renderDataSplitToggler("eval");
  expect(within(screen.getByText("Evaluation Set")).findByRole("SpeedIcon"));
});

test("should the toggle button Training set displayed with ModelTrainingIcon", async () => {
  renderDataSplitToggler("eval");
  expect(
    within(screen.getByText("Training Set")).findByRole("ModelTrainingIcon")
  );
});
