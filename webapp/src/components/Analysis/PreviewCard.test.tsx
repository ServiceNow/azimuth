import { screen } from "@testing-library/react";
import Description from "components/Description";
import { renderWithRouterAndRedux } from "mocks/utils";
import PreviewCard from "./PreviewCard";

test("verify the display of title and description but should not display 'view details", async () => {
  renderWithRouterAndRedux(
    <PreviewCard
      title="Performance Analysis"
      description={
        <Description
          text="Assess model performance through prediction metrics."
          link="/#performance-analysis"
        />
      }
    />
  );

  expect(screen.getByText("Performance Analysis")).toBeInTheDocument();
  expect(
    screen.getByText("Assess model performance through prediction metrics.")
  ).toBeInTheDocument();
  const link: HTMLAnchorElement = screen.getByRole("link");
  expect(link.href).toContain("/#performance-analysis");
  expect(screen.getByText("Learn more")).toBeInTheDocument();
  expect(screen.getByTestId("LinkIcon")).toBeInTheDocument();
});

test("should display 'view details' and link", async () => {
  renderWithRouterAndRedux(
    <PreviewCard
      title="Dataset Class Distribution Analysis"
      to={`/local/dataset_class_distribution_analysis?pipelineIndex=0`}
      description={
        <Description
          text="Compare the class distribution of your training and evaluation sets."
          link="/dataset-warnings/"
        />
      }
    />
  );
  expect(screen.queryByText("View details")).toBeInTheDocument();
  const link: HTMLAnchorElement[] = screen.getAllByRole("link");
  expect(link[1].href).toContain(
    "/local/dataset_class_distribution_analysis?pipelineIndex=0"
  );
});
