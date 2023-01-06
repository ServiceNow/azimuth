import { Box, Button, Paper, Typography } from "@mui/material";
import Description from "components/Description";
import React from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  to?: string;
  linkButtonText?: string;
  description: React.ReactElement<typeof Description>;
  autoHeight?: boolean;
};

const DEFAULT_PREVIEW_CONTENT_HEIGHT = 502;

const PreviewCard: React.FC<Props> = ({
  title,
  to,
  linkButtonText = "View details",
  children,
  description,
  autoHeight,
}) => (
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
        <Button color="secondary" variant="outlined" component={Link} to={to}>
          {linkButtonText}
        </Button>
      )}
    </Box>
    <Box height={autoHeight ? "auto" : DEFAULT_PREVIEW_CONTENT_HEIGHT}>
      {children}
    </Box>
  </Paper>
);

export default PreviewCard;
