import React from "react";
import { Box } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { motion } from "framer-motion";
import { CountPerFilterValue } from "types/api";
import { ALL_OUTCOMES, OUTCOME_COLOR } from "utils/const";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "100%",
    height: "35%",
  },
  proportionContainer: {
    display: "flex",
    height: "100%",
    borderRadius: theme.spacing(1),
    overflow: "auto",
  },
  proportion: {
    height: "100%",
  },
}));

type Props = {
  maxCount: number;
  filter: CountPerFilterValue;
};

const FilterDistribution: React.FC<Props> = ({ maxCount, filter }) => {
  const { outcomeCount, utteranceCount } = filter;

  const classes = useStyles();

  const transition = { type: "tween" };

  const totalProportion = `${maxCount && (100 * utteranceCount) / maxCount}%`;
  return (
    <div className={classes.container}>
      <Box
        component={motion.div}
        className={classes.proportionContainer}
        animate={{ width: totalProportion }}
        role="figure"
        initial={false}
        transition={transition}
        bgcolor={
          outcomeCount ? undefined : (theme) => theme.palette.primary.light
        }
      >
        {outcomeCount &&
          ALL_OUTCOMES.map((outcome) => (
            <Box
              component={motion.div}
              key={outcome}
              className={classes.proportion}
              sx={{
                backgroundColor: theme.palette[OUTCOME_COLOR[outcome]].main,
              }}
              animate={{
                width: `${
                  utteranceCount &&
                  (100 * outcomeCount[outcome]) / utteranceCount
                }%`,
              }}
              initial={false}
              transition={transition}
            />
          ))}
      </Box>
    </div>
  );
};

export default FilterDistribution;
