import { screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import OutcomeIcon from "./OutcomeIcon";
import { Outcome } from "types/api";

const renderOutcomeIcon = (outcome: Outcome) =>
  renderWithTheme(<OutcomeIcon outcome={outcome} />);

describe("OutcomeIcon", () => {
  it("should have a checkIcon if the label contains 'Correct'", () => {
    renderOutcomeIcon("CorrectAndPredicted");
    expect(screen.getByTestId("CheckIcon")).toHaveAttribute(
      "aria-label",
      "Correct & Predicted"
    );
  });
  it("should have a XIcon if the label contains 'Incorrect'", () => {
    renderOutcomeIcon("IncorrectAndPredicted");
    expect(screen.getByTestId("XIcon")).toHaveAttribute(
      "aria-label",
      "Incorrect & Predicted"
    );
  });
  it("should have a right color for the label 'Correct & Predicted'", () => {
    renderOutcomeIcon("CorrectAndPredicted");
    expect(screen.getByLabelText("Correct & Predicted")).toHaveStyle(
      "color: #00B686"
    );
  });
  it("should have a right color for the label 'Correct & Rejected'", () => {
    renderOutcomeIcon("CorrectAndRejected");
    expect(screen.getByLabelText("Correct & Rejected")).toHaveStyle(
      "color: #456857"
    );
  });
  it("should have a right color for the label 'Incorrect & Predicted'", () => {
    renderOutcomeIcon("IncorrectAndPredicted");
    expect(screen.getByLabelText("Incorrect & Predicted")).toHaveStyle(
      "color: #E32437"
    );
  });
  it("should have a right color for the label 'Incorrect & Rejected'", () => {
    renderOutcomeIcon("IncorrectAndRejected");
    expect(screen.getByLabelText("Incorrect & Rejected")).toHaveStyle(
      "color: #FD9700"
    );
  });
});
