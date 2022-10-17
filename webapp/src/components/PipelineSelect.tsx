import { Select, MenuItem } from "@mui/material";
import React from "react";

type Props = {
  selectedPipeline: number | undefined;
  onChange: (value: number | undefined) => void;
  pipelines: { name: string }[];
  disabledPipelines?: number[];
};

const PipelineSelect: React.FC<Props> = ({
  selectedPipeline,
  onChange,
  pipelines,
  disabledPipelines = [],
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
      {pipelines.map(({ name }, i) => (
        <MenuItem key={i} value={i} disabled={disabledPipelines.includes(i)}>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
};
export default React.memo(PipelineSelect);
