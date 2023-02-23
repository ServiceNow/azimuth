import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PipelineSelect from "./PipelineSelect";
import { renderWithTheme } from "mocks/utils";

const handleOnChange = jest.fn();

describe("PipelineSelect", () => {
  const pipelines = [
    { name: "Pipeline_0" },
    { name: "Pipeline_1" },
    { name: "Pipeline_2" },
  ];
  const allPipelines = [
    "No pipeline",
    "Pipeline_0",
    "Pipeline_1",
    "Pipeline_2",
  ];
  it("should list all the pipelines", () => {
    renderWithTheme(
      <PipelineSelect
        selectedPipeline={undefined}
        onChange={handleOnChange}
        pipelines={pipelines}
        disabledPipelines={[]}
      />
    );
    fireEvent.mouseDown(screen.getByRole("button", { name: "No pipeline" }));
    const pipelineListOptions = screen.getAllByRole("option");

    expect(pipelineListOptions).toHaveLength(allPipelines.length);
    pipelineListOptions.forEach((item, index) => {
      expect(item.textContent).toBe(allPipelines[index]);
    });

    fireEvent.click(screen.getByRole("option", { name: "Pipeline_0" }));
    expect(handleOnChange).toBeCalledWith(0);
  });
});
