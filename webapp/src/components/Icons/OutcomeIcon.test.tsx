import { fireEvent, screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import OutcomeIcon from "./OutcomeIcon";
import { Outcome } from "types/api";

const renderOutcomeIcon = (outcome: Outcome) =>
  renderWithTheme(<OutcomeIcon outcome={outcome} />);

test("should display a CheckIcon icon and display a tooltip on hover", async () => {
  renderOutcomeIcon("CorrectAndPredicted");
  const icon = screen.getByTestId("CheckIcon");
  expect(icon).toBeInTheDocument();
  fireEvent.mouseOver(icon);
  expect(screen.getByLabelText("Correct & Predicted")).toBeInTheDocument();
});

test("should display a CheckIcon icon and display a tooltip on hover", async () => {
  renderOutcomeIcon("IncorrectAndPredicted");
  const icon = screen.getByTestId("XIcon");
  expect(icon).toBeInTheDocument();
  fireEvent.mouseOver(icon);
  expect(screen.getByLabelText("Incorrect & Predicted")).toBeInTheDocument();
});
