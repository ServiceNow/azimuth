import { screen } from "@testing-library/react";
import Metric from "components/Metrics/Metric";
import { renderWithTheme } from "mocks/utils";

test("loading metric shows pulsing skeleton", async () => {
  renderWithTheme(
    <Metric name="Correct" description="Bla bla bla" isLoading={true} />
  );

  const value = await screen.findByRole("skeleton");
  expect(value).toHaveClass("MuiSkeleton-pulse");
});

test("loading metric shows pulsing skeleton even with old value", async () => {
  renderWithTheme(
    <Metric
      name="Correct"
      description="Bla bla bla"
      value="55.5%"
      isLoading={true}
    />
  );

  const value = await screen.findByRole("skeleton");
  expect(value).toHaveClass("MuiSkeleton-pulse");
});

test("metric that failed loading shows frozen skeleton", async () => {
  renderWithTheme(
    <Metric name="Correct" description="Bla bla bla" isLoading={false} />
  );

  const skeleton = await screen.findByRole("skeleton");
  expect(skeleton).not.toHaveClass("MuiSkeleton-pulse");
});

test("metric shows percentage", async () => {
  renderWithTheme(
    <Metric
      name="Correct"
      description="Bla bla bla"
      value="55.5%"
      isLoading={false}
    />
  );

  const skeleton = screen.queryByRole("skeleton");
  expect(skeleton).toBeNull();

  await screen.findByText("55.5%");
  await screen.findByText("Correct");
});

test("deflected shows value", async () => {
  renderWithTheme(
    <Metric
      key="Deflected"
      name="Deflected"
      description="Compute the ratio of utterances that are deflected,ie. where no human interaction occurred because the prediction is correct and the class is not the rejection class."
      value="61.0%"
      isLoading={false}
    />
  );

  const skeleton = screen.queryByRole("skeleton");
  expect(skeleton).toBeNull();

  await screen.findByText("61.0%");
  await screen.findByText("Deflected");
});

test("Recall shows value", async () => {
  renderWithTheme(
    <Metric
      key="Recall"
      name="Recall"
      description="Recall is the fraction of the total amount of relevant examples that were actually retrieved. It can be computed with: Recall = TP / (TP + FN) TP: True positive FN: False negative"
      value="85.5%"
      isLoading={false}
    />
  );

  const skeleton = screen.queryByRole("skeleton");
  expect(skeleton).toBeNull();

  await screen.findByText("85.5%");
  await screen.findByText("Recall");
});

test("Precision shows value", async () => {
  renderWithTheme(
    <Metric
      key="Precision"
      name="Precision"
      description="Precision is the fraction of the true examples among the predicted examples. It can be computed with:\nPrecision = TP / (TP + FP) TP: True positive FP: False positive"
      value="80.1%"
      isLoading={false}
    />
  );

  const skeleton = screen.queryByRole("skeleton");
  expect(skeleton).toBeNull();

  await screen.findByText("80.1%");
  await screen.findByText("Precision");
});
