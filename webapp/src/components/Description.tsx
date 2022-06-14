import React from "react";
import { Typography, Link } from "@mui/material";
import Doc from "components/Icons/Doc";
const DOCS_URL = "https://servicenow.github.io/azimuth/user-guide";

type Props = {
  text?: string;
  link?: string;
};

export const Description: React.FC<Props> = ({ text, link }) => {
  return (
    <Typography variant="body2">
      {text}
      {link && (
        <Link href={`${DOCS_URL + link}`} target="_blank">
          <Doc sx={{ position: "relative", top: 4 }} />
        </Link>
      )}
    </Typography>
  );
};
