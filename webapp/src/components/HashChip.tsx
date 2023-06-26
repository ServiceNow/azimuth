import { Chip } from "@mui/material";
import React from "react";

const HashChip: React.FC<{ hash: string }> = ({ hash }) => (
  <Chip
    size="small"
    label={hash}
    sx={{
      fontFamily: "Monospace",
      backgroundColor: `#${hash}`,
      color: (theme) => theme.palette.getContrastText(`#${hash}`),
    }}
  />
);

export default React.memo(HashChip);
