import React from "react";
import { Select, MenuItem } from "@mui/material";
import { PipelineDefinition } from "types/api";

type Props = {
  selectedPipeline: number | string;
  pipelines: PipelineDefinition[] | undefined;
  onChange: (value: number | undefined) => void;
};

const PipelineSelect: React.FC<Props> = ({
  selectedPipeline,
  pipelines,
  onChange,
}) => {
  return (
    <Select
      variant="standard"
      displayEmpty
      value={selectedPipeline ?? ""}
      sx={{ ".MuiSelect-select": { paddingY: 0 } }}
      onChange={({ target: { value } }) =>
        onChange(typeof value === "number" ? value : undefined)
      }
    >
      <MenuItem value="">
        <em>No pipeline</em>
      </MenuItem>
      {pipelines?.map((pipelineData, pipelineIndex) => (
        <MenuItem key={pipelineIndex} value={pipelineIndex}>
          {pipelineData.name}
        </MenuItem>
      ))}
    </Select>
  );
};
export default React.memo(PipelineSelect);
