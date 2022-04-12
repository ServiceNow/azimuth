import { Check, ContentCopy } from "@mui/icons-material";
import { Tooltip, IconButton } from "@mui/material";
import React from "react";

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip arrow open={copied} title="Copied!">
      <IconButton
        size="small"
        sx={(theme) => ({
          "&:hover": { backgroundColor: "unset" },
          ...(!copied && {
            ".MuiDataGrid-row:not(:hover) &": { color: "transparent" },
            "&:not(:hover)": { color: theme.palette.action.focus },
          }),
        })}
        onClick={(e) => {
          e.preventDefault();
          copy();
        }}
      >
        {copied ? <Check color="success" /> : <ContentCopy />}
      </IconButton>
    </Tooltip>
  );
};

export default CopyButton;
