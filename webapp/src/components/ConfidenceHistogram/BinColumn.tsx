import React from "react";
import { Box, Typography } from "@mui/material";

import makeStyles from "@mui/styles/makeStyles";

import { motion } from "framer-motion";
import { ConfidenceBinDetails, Outcome } from "types/api";
import { OUTCOME_COLOR } from "utils/const";

const useStyles = makeStyles((theme) => ({
  binColumn: {
    display: "grid",
    gap: theme.spacing(4),
    width: "100%",
    "& > div:first-child, & > div:first-child > div": {
      flexDirection: "column-reverse",
    },
    "& > div:last-child, & > div:last-child > div": {
      flexDirection: "column",
    },
  },
  binHalf: {
    height: "100%",
    backgroundColor: `${theme.palette.grey[50]}`,
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  proportion: {
    width: "100%",
  },
  proportionContainer: {
    width: "100%",
    height: "100%",
    display: "flex",
  },
}));

type Props = {
  bin: ConfidenceBinDetails;
  max: number;
  filteredOutcomes: readonly Outcome[];
  topOutcomes: Outcome[];
  bottomOutcomes: Outcome[];
};

const BinColumn: React.FC<Props> = ({
  bin: { outcomeCount },
  max,
  filteredOutcomes,
  topOutcomes,
  bottomOutcomes,
}) => {
  const classes = useStyles();

  const bar = (outcome: Outcome) => (
    <Box
      component={motion.div}
      key={outcome}
      className={classes.proportion}
      sx={{
        backgroundColor: (theme) =>
          filteredOutcomes.includes(outcome)
            ? theme.palette[OUTCOME_COLOR[outcome]].main
            : theme.palette.grey[300],
      }}
      animate={{
        height: `${max ? (100 * outcomeCount[outcome]) / max : 0}%`,
      }}
      initial={false}
      transition={{ type: "tween" }}
    />
  );

  const binHalf = (outcomes: Outcome[]) => (
    <div className={classes.binHalf}>
      <div className={classes.proportionContainer}>{outcomes.map(bar)}</div>
      <Typography align="center" fontSize={12} paddingY={0.5}>
        {outcomes.map((o) => outcomeCount[o]).reduce((a, b) => a + b)}
      </Typography>
    </div>
  );

  return (
    <div className={classes.binColumn}>
      {binHalf(topOutcomes)}
      {binHalf(bottomOutcomes)}
    </div>
  );
};

export default BinColumn;
