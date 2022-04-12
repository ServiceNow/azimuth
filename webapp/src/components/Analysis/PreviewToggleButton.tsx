import { Skeleton, ToggleButton, ToggleButtonProps } from "@mui/material";
import React from "react";

type Props = ToggleButtonProps & {
  isError: boolean;
  isFetching: boolean;
};

const PreviewToggleButton: React.FC<Props> = ({
  isError,
  isFetching,
  children,
  ...props
}) => (
  <ToggleButton
    {...props}
    sx={{ display: "block", padding: 3, textAlign: "left" }}
  >
    {isError || isFetching
      ? React.Children.map(children, (child) => (
          // default animation while fetching, false in case of an error
          <Skeleton animation={isFetching && undefined}>{child}</Skeleton>
        ))
      : children}
  </ToggleButton>
);

export default PreviewToggleButton;
