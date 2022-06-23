import React from "react";
import { Box, Typography, Link } from "@mui/material";
import LinkIcon from "@mui/icons-material/InsertLink";
const DOCS_URL = "https://servicenow.github.io/azimuth/user-guide";

type Props = {
  text?: string;
  link?: string;
};

const Description: React.FC<Props> = ({ text, link }) => {
  return (
    <Box display="flex" gap={1} alignContent="center">
      {text && <Typography variant="body2">{text}</Typography>}
      {link && (
        <Link
          href={`${DOCS_URL + link}`}
          variant="body2"
          color="secondary"
          target="_blank"
        >
          <LinkIcon sx={{ marginRight: 0.5, marginY: "-5px" }} />
          Learn more
        </Link>
      )}
    </Box>
  );
};
export default React.memo(Description);
