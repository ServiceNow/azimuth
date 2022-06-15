import { screen } from "@testing-library/react";
import Description from "components/Description";
import { renderWithTheme } from "mocks/utils";

test("display description with just text", async () => {
  renderWithTheme(<Description text="test description" />);

  await screen.findByText("test description");
});

test("display description with both link and text", async () => {
  renderWithTheme(
    <Description
      text="test description"
      link="https://servicenow.github.io/azimuth/"
    />
  );

  await screen.findByText("test description");

  const links: HTMLAnchorElement[] = screen.getAllByRole("link");
  expect(links[0].href).toContain("https://servicenow.github.io/azimuth/");
  await screen.getByTestId("docIcon");
});
