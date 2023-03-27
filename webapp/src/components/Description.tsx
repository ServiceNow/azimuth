import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Typography, Link } from "@mui/material";
import React from "react";

const DOCS_URL = "https://servicenow.github.io/azimuth/main/";

type Props = {
  text?: string;
  link?: string;
};

const Description: React.FC<Props> = ({ text, link }) => {
  return (
    <Box display="flex" gap={1}>
      {text && (
        <Typography variant="body2" whiteSpace="pre-wrap">
          {text}
        </Typography>
      )}
      {link && (
        <Link
          href={DOCS_URL + link}
          variant="body2"
          color="secondary"
          target="_blank"
          onClick={(event) => event.stopPropagation()}
        >
          <OpenInNewIcon sx={{ marginRight: 0.5, marginY: "-5px" }} />
          Learn more
        </Link>
      )}
    </Box>
  );
};
export default React.memo(Description);
