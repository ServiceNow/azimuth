import { Typography } from "@mui/material";
import { fireEvent, screen } from "@testing-library/react";
import AccordionLayout from "components/AccordionLayout";
import { renderWithTheme } from "mocks/utils";

describe("AccordionLayout", () => {
  it("should display name, description and description component on the accordion layout", () => {
    const props = {
      name: "Project Config",
      description:
        "Contains mandatory fields that specify the dataset to load in Azimuth",
      link: "reference/configuration/project/",
      children: <Typography>Project Config Section</Typography>,
    };
    renderWithTheme(<AccordionLayout {...props} />);
    expect(screen.getByText("Project Config")).toBeVisible();
    expect(
      screen.getByText(
        "Contains mandatory fields that specify the dataset to load in Azimuth"
      )
    ).toBeVisible();
    const link: HTMLAnchorElement = screen.getByRole("link");
    expect(link.href).toContain(
      "https://servicenow.github.io/azimuth/main/reference/configuration/project/"
    );
    screen.getByText("Learn more");
    screen.getByTestId("OpenInNewIcon");
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("Project Config Section")).toBeVisible();
  });
});
