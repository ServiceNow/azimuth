import { Info } from "@mui/icons-material";
import {
  Box,
  BoxProps,
  Skeleton,
  Theme,
  Tooltip,
  tooltipClasses,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";

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
  color?: string | ((theme: Theme) => string);
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

  const tooltip = (
    <Typography variant="inherit" whiteSpace="pre-wrap">
      {description.trim()}
    </Typography>
  );

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
          <Typography align="center" variant="h6" width="5ch" sx={{ color }}>
            {/* 5ch is wide enough for 100.0% */}
            {(!isLoading && value) || (
              <Skeleton
                role="skeleton"
                variant="text"
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
