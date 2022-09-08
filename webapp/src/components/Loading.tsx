import React from "react";
import { Box, BoxProps, CircularProgress } from "@mui/material";

const Loading = (props: BoxProps) => {
  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      <CircularProgress />
    </Box>
  );
};

export default React.memo(Loading);
