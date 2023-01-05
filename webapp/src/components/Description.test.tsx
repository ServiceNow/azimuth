import { screen } from "@testing-library/react";
import Description from "components/Description";
import { renderWithTheme } from "mocks/utils";

describe("Description", () => {
  it("should display description with text only", async () => {
    renderWithTheme(<Description text="test description" />);

    screen.getByText("test description");
  });

  it("should display description with both link and text", async () => {
    renderWithTheme(
      <Description
        text="test description"
        link="https://servicenow.github.io/azimuth/"
      />
    );

    screen.getByText("test description");

    const link: HTMLAnchorElement = screen.getByRole("link");
    expect(link.href).toContain("https://servicenow.github.io/azimuth/");
    screen.getByText("Learn more");
    screen.getByTestId("OpenInNewIcon");
  });
});
