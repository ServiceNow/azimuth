import { screen } from "@testing-library/react";
import Description from "components/Description";
import { renderWithTheme } from "mocks/utils";

test("display description with just text", async () => {
  renderWithTheme(<Description text="test description" />);

  expect(screen.getByText("test description")).toBeInTheDocument();
});

test("display description with both link and text", async () => {
  renderWithTheme(
    <Description
      text="test description"
      link="https://servicenow.github.io/azimuth/"
    />
  );

  expect(screen.getByText("test description")).toBeInTheDocument();

  const link: HTMLAnchorElement = screen.getByRole("link");
  expect(link.href).toContain("https://servicenow.github.io/azimuth/");
  expect(screen.getByText("Learn more")).toBeInTheDocument();
  expect(screen.getByTestId("LinkIcon")).toBeInTheDocument();
});

test("verify conditional rendering of text display if available", async () => {
  renderWithTheme(<Description link="https://servicenow.github.io/azimuth/" />);
  expect(screen.queryByText("test description")).toBeNull();
});

test("verify conditional rendering of link display if available", async () => {
  renderWithTheme(<Description text="test description" />);
  expect(screen.queryByText("Learn more")).toBeNull();
  expect(screen.queryByTestId("LinkIcon")).toBeNull();
});
