import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithTheme } from "mocks/utils";
import SeeMoreLess from "./SeeMoreLess";

const handleClickShowMore = jest.fn();
const handleClickShowLess = jest.fn();

const renderSeeMoreLess = (nextStepUp: number, showLessVisible: boolean) =>
  renderWithTheme(
    <SeeMoreLess
      nextStepUp={nextStepUp}
      showLessVisible={showLessVisible}
      onClickShowMore={handleClickShowMore}
      onClickShowLess={handleClickShowLess}
    />
  );

describe("SeeMoreLess", () => {
  it("it should show 'see more' with nextStepUp but hide 'see less'", () => {
    renderSeeMoreLess(11, false);
    expect(screen.getByRole("button", { name: "See more (11)" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "See less" })).toBeNull();
  });

  it("it should disable 'see more' if nextStepUp is lesser than one but show 'see less", () => {
    renderSeeMoreLess(0, true);
    expect(screen.getByRole("button", { name: "See more (0)" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "See less" })
    ).toBeInTheDocument();
  });

  it("should disappear 'see less' if onClickShowLess button is fired", () => {
    renderSeeMoreLess(0, true);
    fireEvent.click(screen.getByRole("button", { name: "See less" }));
    expect(handleClickShowLess).toBeCalled();
  });

  it("should disable 'see more' if onClickShowMore button is fired and nextStepup becomes 0 after this case", () => {
    renderSeeMoreLess(11, false);
    fireEvent.click(screen.getByRole("button", { name: "See more (11)" }));
    expect(handleClickShowMore).toBeCalled();
  });
});
