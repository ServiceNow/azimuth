import { Chip, Tooltip } from "@mui/material";
import React from "react";

const HashChip: React.FC<{ hash: string }> = ({ hash }) => (
  <Tooltip title="This hash of the config lets you see when the same config appears multiple times.">
    <Chip
      size="small"
      label={hash}
      sx={(theme) => ({
        backgroundColor: `#${hash}`,
        color: theme.palette.getContrastText(`#${hash}`),
        cursor: "unset",
        fontFamily: "Monospace",
      })}
    />
  </Tooltip>
);

export default React.memo(HashChip);
