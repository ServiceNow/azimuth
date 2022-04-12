import React from "react";
import { Typography } from "@mui/material";

type Props = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

const DatasetWarning: React.FC<Props> = ({ title, description, children }) => {
  return (
    <div>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body1">{description}</Typography>
      <div>{children}</div>
    </div>
  );
};

export default DatasetWarning;
