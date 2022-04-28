import { Box, Typography } from "@mui/material";
import React from "react";
import noData from "assets/void.svg";

const NotFound = () => (
  <Box
    width="100%"
    height="100%"
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    gap={4}
  >
    <img src={noData} width="600px" alt="page not found" />
    <Typography variant="h2">Page not found</Typography>
  </Box>
);

export default React.memo(NotFound);
