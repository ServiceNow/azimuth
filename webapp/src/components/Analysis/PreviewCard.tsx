import { Box, Button, Paper, Typography } from "@mui/material";
import { Description } from "components/Description";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  to?: string;
  href?: string;
};

const PreviewCard: React.FC<Props> = ({
  title,
  subtitle,
  to,
  href,
  children,
}) => (
  <Paper
    variant="outlined"
    sx={{ display: "flex", flexDirection: "column", gap: 4, padding: 4 }}
  >
    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
      <Box display="flex" flexDirection="column">
        <Typography variant="h4">{title}</Typography>
        {subtitle && href && <Description text={subtitle} link={href} />}
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
