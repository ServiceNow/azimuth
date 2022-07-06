import { screen } from "@testing-library/react";
import DatasetWarning from "./DatasetWarning";
import { renderWithTheme } from "mocks/utils";

test("should display both title and description", async () => {
  renderWithTheme(
    <DatasetWarning
      title="Missing samples (<20)"
      description="Nb of samples per class in the training or evaluation set is below 20."
    />
  );

  expect(screen.getByText("Missing samples (<20)")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Nb of samples per class in the training or evaluation set is below 20."
    )
  ).toBeInTheDocument();
});
