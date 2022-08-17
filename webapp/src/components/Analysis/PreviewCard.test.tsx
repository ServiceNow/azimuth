import { screen, waitFor } from "@testing-library/react";
import Description from "components/Description";
import { renderWithRouterAndRedux } from "mocks/utils";
import PreviewCard from "./PreviewCard";

const renderPreviewCard = (
  title: string,
  description: React.ReactElement<typeof Description>,
  to?: string
) =>
  renderWithRouterAndRedux(
    <PreviewCard title={title} to={to} description={description} />
  );

describe("PreviewCard", () => {
  it("should display the title and description without 'view details' button", async () => {
    const description = (
      <Description
        text="Assess model performance through prediction metrics."
        link="/#performance-analysis"
      />
    );
    renderPreviewCard("Performance Analysis", description);
    await waitFor(() => {
      // verify title and description displayed as expected
      expect(screen.getByText("Performance Analysis")).toBeVisible();
      expect(
        screen.getByText("Assess model performance through prediction metrics.")
      ).toBeVisible();
      // verify the documentation link
      const link: HTMLAnchorElement = screen.getByRole("link");
      expect(link.href).toContain("/#performance-analysis");
      expect(screen.getByText("Learn more")).toBeVisible();
      expect(screen.getByTestId("LinkIcon")).toBeInTheDocument();
      // verify if the view details is not displayed if 'to' param is unavailable
      expect(screen.queryByText(/View details/i)).toBeNull();
    });
  });

  it("should display title, description and 'View details'", async () => {
    const description = (
      <Description
        text="Compare the class distribution of your training and evaluation sets."
        link="/dataset-warnings/"
      />
    );
    renderPreviewCard(
      "Dataset Class Distribution Analysis",
      description,
      "/local/dataset_class_distribution_analysis?pipeline_index=0"
    );
    await waitFor(() => {
      expect(screen.getByText("View details")).toBeInTheDocument();
      const link: HTMLAnchorElement[] = screen.getAllByRole("link");
      expect(link[1].href).toEqual(
        expect.stringContaining(
          "/local/dataset_class_distribution_analysis?pipeline_index=0"
        )
      );
    });
  });
});
