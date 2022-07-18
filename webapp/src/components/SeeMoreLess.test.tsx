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

test("should disable the see more button if nextstep is 0 and diplay see less", async () => {
  renderSeeMoreLess(0, true);
  expect(screen.queryByText(/See more/i)).toHaveClass("Mui-disabled");
  expect(screen.queryByText(/See less/i)).toHaveStyle({
    visibility: "visible",
  });
});

test("should display the see more button with nexstep if nextstep is greater than 0 and ", async () => {
  renderSeeMoreLess(10, false);
  expect(screen.queryByText(/See more/i)).not.toHaveClass("Mui-disabled");
  expect(screen.queryByText(/See less/i)).toHaveStyle({
    visibility: "hidden",
  });
  fireEvent.click(screen.getByText(/See more/i));
  expect(onClickShowMoreMock).toHaveBeenCalled();
});

test("should trigger onClickShowMore", async () => {
  renderSeeMoreLess(10, false);
  expect(screen.queryByText(/See more/i)).not.toHaveClass("Mui-disabled");
  fireEvent.click(screen.getByText(/See more/i));
  expect(onClickShowMoreMock).toHaveBeenCalledTimes(1);
});

test("should trigger onClickShowLess", async () => {
  renderSeeMoreLess(0, true);
  expect(screen.queryByText(/See less/i)).toHaveStyle({
    visibility: "visible",
  });
  fireEvent.click(screen.getByText(/See less/i));
  expect(onClickShowLessMock).toHaveBeenCalledTimes(1);
});
