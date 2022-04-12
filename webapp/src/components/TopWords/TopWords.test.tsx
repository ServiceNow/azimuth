import { screen } from "@testing-library/react";
import TopWords from "components/TopWords/TopWords";
import { renderWithTheme } from "mocks/utils";

test("word distribution", async () => {
  renderWithTheme(
    <TopWords
      wordCounts={[
        { word: "Poutine", count: 10 },
        { word: "Oreo", count: 5 },
        { word: "Chips", count: 1 },
      ]}
      palette="success"
    />
  );

  const biggestWord = await screen.findByText("Poutine (10)");
  expect(biggestWord).toHaveStyle("opacity: 1");
  expect(biggestWord).toHaveStyle("font-size: 3.5em");
  const middleWord = await screen.findByText("Oreo (5)");
  expect(middleWord).toHaveStyle("opacity: 0.6");
  expect(middleWord).toHaveStyle("font-size: 1.75em");
  const smallestWord = await screen.findByText("Chips (1)");
  expect(smallestWord).toHaveStyle("opacity: 0.6");
  expect(smallestWord).toHaveStyle("font-size: 1.2em");
});
