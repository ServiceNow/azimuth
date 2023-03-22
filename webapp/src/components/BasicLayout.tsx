import React from "react";
import { Box, Breakpoint, Container } from "@mui/material";

type Props = {
  maxWidth?: Breakpoint;
  children: React.ReactNode;
};

const BasicLayout: React.FC<Props> = ({ maxWidth = "xl", children }) => (
  <Box height="100%" display="flex" flexDirection="column" overflow="auto">
    <Container maxWidth={maxWidth} sx={{ flex: 1, minHeight: 0, padding: 2 }}>
      {children}
    </Container>
  </Box>
);

export default React.memo(BasicLayout);
