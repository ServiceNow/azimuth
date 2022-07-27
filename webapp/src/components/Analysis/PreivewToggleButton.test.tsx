import { screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import PreviewToggleButton from "./PreviewToggleButton";

test("should display a skeleton if fetching data", async () => {
  renderWithTheme(
    <PreviewToggleButton
      key={1}
      value={undefined}
      disabled={false}
      isError={true}
      isFetching={true}
    />
  );
  const skeleton = screen.queryByRole("skeleton") as HTMLInputElement;
  expect(skeleton).toBeDefined();
});

test("should not display a skeleton if data is undefined", async () => {
  renderWithTheme(
    <PreviewToggleButton
      key={1}
      value={undefined}
      isError={true}
      isFetching={false}
    />
  );
  const skeleton = screen.queryByRole("skeleton") as HTMLInputElement;
  expect(skeleton).toBeDefined();
});
