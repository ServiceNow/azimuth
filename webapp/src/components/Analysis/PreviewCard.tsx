import { Box, Button, Paper, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  to?: string;
};

const PreviewCard: React.FC<Props> = ({ title, to, children }) => (
  <Paper
    variant="outlined"
    sx={{ display: "flex", flexDirection: "column", gap: 4, padding: 4 }}
  >
    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
      <Typography variant="h4">{title}</Typography>
      {to && (
        <Button color="secondary" variant="outlined" component={Link} to={to}>
          View details
        </Button>
      )}
    </Box>
    {children}
  </Paper>
);

export default PreviewCard;
