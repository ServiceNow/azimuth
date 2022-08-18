import { fireEvent, screen } from "@testing-library/react";
import { renderWithRouterAndRedux } from "mocks/utils";
import DatasetSplitToggler from "./DatasetSplitToggler";
import { AvailableDatasetSplits, DatasetSplitName } from "types/api";

const handleValueChange = jest.fn();
const renderDatasetSplitToggler = (
  availableDatasetSplits: AvailableDatasetSplits | undefined,
  value: DatasetSplitName
) =>
  renderWithRouterAndRedux(
    <DatasetSplitToggler
      availableDatasetSplits={availableDatasetSplits}
      value={value}
      onChange={handleValueChange}
    />
  );

describe("DatasetSplitToggler", () => {
  it("should test the toggle buttons - count, display names and icons of it", () => {
    renderDatasetSplitToggler({ train: true, eval: true }, "eval");
    // verify if the toggles displayed with correct names
    expect(
      screen.getByRole("button", { name: "Evaluation Set", pressed: true })
    ).toHaveValue("eval");
    expect(
      screen.getByRole("button", { name: "Training Set", pressed: false })
    ).toHaveValue("train");
    // verify if the icons are displayed
    expect(screen.getByTestId("SpeedIcon")).toBeInTheDocument();
    expect(screen.getByTestId("ModelTrainingIcon")).toBeInTheDocument();
  });
  it("should disable the toggle button if one of the dataset split is unavailable", () => {
    renderDatasetSplitToggler({ train: false, eval: true }, "eval");
    expect(screen.getByRole("button", { name: "Training Set" })).toHaveClass(
      "Mui-disabled"
    );
  });
  it("should trigger the change of a button and send the selected toggled value", () => {
    renderDatasetSplitToggler({ train: true, eval: true }, "eval");
    const trainToggleButton = screen.getByRole("button", {
      name: "Training Set",
      pressed: false,
    });
    // after onChange
    fireEvent.click(trainToggleButton);
    expect(handleValueChange).toBeCalledWith("train");
  });
});
