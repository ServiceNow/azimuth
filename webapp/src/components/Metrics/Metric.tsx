import React from "react";

import makeStyles from "@mui/styles/makeStyles";

import { Info } from "@mui/icons-material";
import {
  Box,
  BoxProps,
  Skeleton,
  Tooltip,
  tooltipClasses,
  Typography,
  useTheme,
} from "@mui/material";

const useStyles = makeStyles(() => ({
  popper: {
    [`& .${tooltipClasses.tooltip}`]: {
      maxWidth: 500,
    },
  },
}));

type Props = {
  name: string;
  description: string;
  isLoading: boolean;
  value?: string;
  color?: string;
  flexDirection?: BoxProps["flexDirection"];
};

const Metric: React.FC<Props> = ({
  name,
  description,
  isLoading,
  value,
  color,
  flexDirection,
}) => {
  const classes = useStyles();
  const theme = useTheme();

  const tooltip = description
    .trim()
    .split("\n")
    .map((paragraph) => <Typography variant="inherit">{paragraph}</Typography>);

  return (
    <Box display="flex" justifyContent="flex-end">
      <Tooltip title={tooltip} classes={{ popper: classes.popper }}>
        <Box
          height="100%"
          paddingX={2.5}
          display="flex"
          flexDirection={flexDirection}
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          <Typography marginX={0.5} whiteSpace="nowrap">
            {name}
          </Typography>
          <Typography marginX={0.5} variant="h6" sx={{ color }}>
            {(!isLoading && value) || (
              <Skeleton
                role="skeleton"
                variant="text"
                width={theme.spacing(7)}
                animation={isLoading && undefined} // default animation when loading, false in case of an error
              />
            )}
          </Typography>
          <Info
            color="primary"
            fontSize="small"
            sx={{ position: "absolute", top: 0, right: 0, margin: 0.5 }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default React.memo(Metric);
