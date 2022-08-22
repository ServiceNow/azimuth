import { BoxProps } from "@mui/material";
import { screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import VisualBar from "./VisualBar";

const renderVisualBar = (
  formattedValue: string,
  value: number,
  color: BoxProps["bgcolor"]
) =>
  renderWithTheme(
    <VisualBar formattedValue={formattedValue} value={value} color={color} />
  );

describe("VisualBar", () => {
  it("should render expected value with correct styling (height, width, bgcolor", () => {
    renderVisualBar("39.1%", 0.39134, "#00B686");
    expect(screen.getByText("39.1%")).toBeVisible();
    expect(
      screen.getByText("39.1%").parentElement!.lastChild!.firstChild
    ).toHaveStyle("width:39.134%;height:90%;background-color:#00B686");
  });
});
