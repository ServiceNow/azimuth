import React from "react";
import { Typography, Link } from "@mui/material";
import Doc from "components/Icons/Doc";

const DOCS_URL = "https://servicenow.github.io/azimuth";
type Props = {
  text: string;
  link: string;
};

const Description: React.FC<Props> = ({ text, link }) => (
  <Typography variant="body2">
    {text}
    <Link href={`${DOCS_URL + link}`} target="_blank">
      <Doc />
    </Link>
  </Typography>
);

export default React.memo(Description);
