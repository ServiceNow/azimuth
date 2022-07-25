import { fireEvent, screen } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import SeeMoreLess from "./SeeMoreLess";

const onClickShowMoreMock = jest.fn();
const onClickShowLessMock = jest.fn();
const renderSeeMoreLess = (nextStepUp: number, showLessVisible: boolean) =>
  renderWithTheme(
    <SeeMoreLess
      nextStepUp={nextStepUp}
      showLessVisible={showLessVisible}
      onClickShowMore={onClickShowMoreMock}
      onClickShowLess={onClickShowLessMock}
    />
  );

test("should disable the see more button if nextstep is 0 and diplay see less", () => {
  renderSeeMoreLess(0, true);
  expect(screen.queryByText(/See more/i)).toHaveClass("Mui-disabled");
  expect(screen.queryByText(/See less/i)).toHaveStyle({
    visibility: "visible",
  });
});

test("should display the see more button with nexstep if nextstep is greater than 0 and ", () => {
  renderSeeMoreLess(10, false);
  expect(screen.queryByText("See more (10)")).toBeInTheDocument();
  expect(screen.queryByText(/See more/i)).not.toHaveClass("Mui-disabled");
  expect(screen.queryByText(/See less/i)).toHaveStyle({
    visibility: "hidden",
  });
});

test("should trigger onClickShowMore", () => {
  renderSeeMoreLess(10, false);
  const seemore = screen.getByText(/See more/i);
  expect(seemore).not.toHaveClass("Mui-disabled");
  fireEvent.click(seemore);
  expect(onClickShowMoreMock).toHaveBeenCalledTimes(1);
});

test("should trigger onClickShowLess", () => {
  renderSeeMoreLess(0, true);
  const seeless = screen.getByText(/See less/i);
  expect(seeless).toHaveStyle({
    visibility: "visible",
  });
  fireEvent.click(seeless);
  expect(onClickShowLessMock).toHaveBeenCalledTimes(1);
});
