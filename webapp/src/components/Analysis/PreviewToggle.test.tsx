import { ToggleButton, Typography } from "@mui/material";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import React from "react";
import PreviewToggle from "./PreviewToggle";

export const Button1: React.ReactElement<typeof ToggleButton> = (
  <ToggleButton value="first">First</ToggleButton>
);

export const Content1: React.ReactNode = () => {
  return <Typography>First Test Content</Typography>;
};

export const Button2: React.ReactElement<typeof ToggleButton> = (
  <ToggleButton value="second">Second</ToggleButton>
);

export const Content2: React.ReactNode = () => {
  return <Typography>Second Test Content</Typography>;
};

const testProps = [
  {
    button: Button1,
    content: Content1,
  },
  {
    button: Button2,
    content: Content2,
  },
];

const renderPreviewToggle = () =>
  renderWithTheme(<PreviewToggle options={testProps} />);

test("should see 2 toggle buttons added", () => {
  renderPreviewToggle();
  waitFor(() => {
    expect(screen.queryByText("First")).toBeInTheDocument();
    expect(screen.queryByText("Second")).toBeInTheDocument();
  });
});

test("should display the content of the selected toggle", () => {
  renderPreviewToggle();
  waitFor(() => {
    const toggle = screen.getByText("Second");
    fireEvent.click(toggle);
    expect(toggle.textContent).toBe("Second Test Content");
  });
});
