import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { CountPerFilterValue } from "types/api";
import { ALL_OUTCOMES, OUTCOME_COLOR } from "utils/const";

type Props = {
  maxCount: number;
  filter: CountPerFilterValue;
};

const FilterDistribution: React.FC<Props> = ({ maxCount, filter }) => {
  const { outcomeCount, utteranceCount } = filter;

  const transition = { type: "tween" };

  const totalProportion = `${maxCount && (100 * utteranceCount) / maxCount}%`;
  return (
    <Box width="100%" height="35%">
      <Box
        component={motion.div}
        display="flex"
        height="100%"
        borderRadius={1}
        overflow="auto"
        animate={{ width: totalProportion }}
        role="figure"
        initial={false}
        transition={transition}
        bgcolor={
          outcomeCount ? undefined : (theme) => theme.palette.secondary.dark
        }
      >
        {outcomeCount &&
          ALL_OUTCOMES.map((outcome) => (
            <Box
              component={motion.div}
              key={outcome}
              bgcolor={(theme) => theme.palette[OUTCOME_COLOR[outcome]].main}
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
    </Box>
  );
};

export default FilterDistribution;
