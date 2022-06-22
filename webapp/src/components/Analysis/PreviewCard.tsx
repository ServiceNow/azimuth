import { Box, Button, Paper, Typography } from "@mui/material";
import Description from "components/Description";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

type Props = {
  title: string;
  to?: string;
  description: React.ReactElement<typeof Description>;
};

const PreviewCard: React.FC<Props> = ({ title, to, children, description }) => (
  <Paper
    variant="outlined"
    sx={{ display: "flex", flexDirection: "column", gap: 4, padding: 4 }}
  >
    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
      <Box display="flex" flexDirection="column">
        <Typography variant="h4">{title}</Typography>
        {description}
      </Box>
      {to && (
        <Button
          color="secondary"
          variant="outlined"
          component={RouterLink}
          to={to}
        >
          View details
        </Button>
      )}
    </Box>

    {children}
  </Paper>
);

export default PreviewCard;
