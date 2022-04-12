import { screen } from "@testing-library/react";
import FilterSlider from "./FilterSlider";
import { renderWithTheme } from "mocks/utils";

test("filter whole range", async () => {
  renderWithTheme(
    <FilterSlider
      label="Confidence"
      filterRange={[0, 1]}
      setFilterRange={() => {}}
    />
  );

  expect(await screen.queryByText("(0% to 100%)")).toBeNull();
});

test("filter min", async () => {
  renderWithTheme(
    <FilterSlider
      label="Confidence"
      filterRange={[0.1, 1]}
      setFilterRange={() => {}}
    />
  );

  await screen.findByText("(10% to 100%)");
});

test("filter max", async () => {
  renderWithTheme(
    <FilterSlider
      label="Confidence"
      filterRange={[0, 0.5]}
      setFilterRange={() => {}}
    />
  );

  await screen.findByText("(0% to 50%)");
});

test("filter min and max", async () => {
  renderWithTheme(
    <FilterSlider
      label="Confidence"
      filterRange={[0.1, 0.5]}
      setFilterRange={() => {}}
    />
  );

  await screen.findByText("(10% to 50%)");
});
