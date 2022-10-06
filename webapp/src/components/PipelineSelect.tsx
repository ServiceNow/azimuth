import { Select, MenuItem } from "@mui/material";
import React from "react";

type Props = {
  selectedPipeline: number | undefined;
  children: React.ReactNode;
  onChange: (value: number | undefined) => void;
};

const PipelineSelect: React.FC<Props> = ({
  selectedPipeline,
  children,
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
      {children}
    </Select>
  );
};
export default React.memo(PipelineSelect);
