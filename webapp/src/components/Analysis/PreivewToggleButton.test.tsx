import { screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import PreviewToggleButton from "./PreviewToggleButton";

test("should display a skeleton if error or fetching data", async () => {
  renderWithTheme(
    <PreviewToggleButton
      key={1}
      value="test"
      isError={true}
      isFetching={true}
    />
  );
  const skeleton = screen.queryByRole("skeleton") as HTMLInputElement;
  expect(skeleton).toBeDefined();
});
