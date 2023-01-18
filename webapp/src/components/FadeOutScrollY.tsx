import { Box, BoxProps } from "@mui/material";
import React from "react";

const FADE_HEIGHT = "24px";

const FadeOutScrollY: React.FC<BoxProps> = (props) => (
  <Box
    overflow="auto"
    paddingY={FADE_HEIGHT}
    sx={{
      mask: `linear-gradient(transparent, black ${FADE_HEIGHT} calc(100% - ${FADE_HEIGHT}), transparent)`,
    }}
    {...props}
  />
);

export default React.memo(FadeOutScrollY);
