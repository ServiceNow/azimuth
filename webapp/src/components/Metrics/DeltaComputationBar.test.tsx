import { screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import DeltaComputationBar from "./DeltaComputationBar";

const renderDeltaComputationBar = (
  value: number,
  formattedValue: string,
  width: number
) =>
  renderWithTheme(
    <DeltaComputationBar
      formattedValue={formattedValue}
      value={value}
      width={width}
    />
  );

describe("DeltaComputationBar", () => {
  it("should display the bar and the formatter value with expected bgcolor, width and position if the value is greater than 0", () => {
    renderDeltaComputationBar(45.5, "45.5", 45.5);
    expect(screen.getByTestId("delta-computation-bar")).toHaveStyle(
      "width:45.5%;background-color:rgba(99, 204, 255, 0.8);left:50%"
    );
    expect(screen.getByTestId("delta-computation-value")).toHaveTextContent(
      "+45.5"
    );
    expect(screen.getByTestId("delta-computation-value")).toHaveStyle(
      "color:rgb(0, 109, 179);right:55%"
    );
  });
  it("should display the bar with expected bgcolor, width and position if the value is lesser than 0", () => {
    renderDeltaComputationBar(-45.5, "45.5", 45.5);
    expect(screen.getByTestId("delta-computation-bar")).toHaveStyle(
      "width:45.5%;background-color:rgba(37, 36, 54, 0.6);right:50%"
    );
  });
});
