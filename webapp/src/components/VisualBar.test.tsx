import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import { BoxProps } from "@mui/material";
import VisualBar from "./VisualBar";
import theme from "styles/theme";

const renderVisualBar = (
  formattedValue: string,
  value: number,
  color: BoxProps["bgcolor"]
) =>
  renderWithTheme(
    <VisualBar formattedValue={formattedValue} value={value} color={color} />
  );

test("should display formatted value ", async () => {
  renderVisualBar("40.0%", 40, "#0F0F17");
  const content = screen.queryByText("40.0%");
  expect(content).toBeInTheDocument();
});
