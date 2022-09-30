import React from "react";
import { Select, MenuItem } from "@mui/material";

type Props = {
  selectedPipeline: number | string;
  pipelineMenuItem: React.ReactNode;
  onChange: (value: number | undefined) => void;
};

const PipelineSelect: React.FC<Props> = ({
  selectedPipeline,
  pipelineMenuItem,
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
      {pipelineMenuItem}
    </Select>
  );
};
export default React.memo(PipelineSelect);
