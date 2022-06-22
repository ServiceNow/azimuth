import React from "react";
import { Box, Typography, Link } from "@mui/material";
import Doc from "components/Icons/Doc";
import LinkIcon from "@mui/icons-material/InsertLink";
const DOCS_URL = "https://servicenow.github.io/azimuth/user-guide";

type Props = {
  text?: string;
  link?: string;
};

const Description: React.FC<Props> = ({ text, link }) => {
  return (
    <Box display="flex" gap={1} alignContent="center">
      <Typography variant="body2">{text}</Typography>
      {link && (
        <Typography
          variant="body2"
          display="inline"
          align="center"
          sx={{ position: "relative", bottom: 5 }}
        >
          <Link href={`${DOCS_URL + link}`} color="secondary" target="_blank">
            <LinkIcon sx={{ position: "relative", top: 5, marginRight: 0.2 }} />
            Learn more
          </Link>
        </Typography>
      )}
    </Box>
  );
};
export default React.memo(Description);
