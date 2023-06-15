import { Button, ButtonProps } from "@mui/material";
import React from "react";

const FileInputButton: React.FC<
  { accept: string; onFileRead: (text: string) => void } & ButtonProps<"label">
> = ({ accept, onFileRead, children, ...props }) => (
  <Button component="label" {...props}>
    {children}
    <input
      hidden
      accept={accept}
      type="file"
      onChange={({ target }) => {
        if (target.files?.length) {
          const fileReader = new FileReader();
          fileReader.onload = ({ target }) => {
            if (target) {
              onFileRead(target.result as string);
            }
          };
          fileReader.readAsText(target.files[0]);
        }
      }}
    />
  </Button>
);

export default React.memo(FileInputButton);
