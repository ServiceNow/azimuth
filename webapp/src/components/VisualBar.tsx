import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  formattedValue: string;
  width: number;
  bgColor: string;
};

const VisualBar: React.FC<Props> = ({ formattedValue, width, bgColor }) => {
  return (
    <Box
      display="grid"
      gridAutoColumns={50}
      gridAutoFlow="column"
      alignItems="center"
    >
      {formattedValue}
      <Box
        component={motion.div}
        key={formattedValue}
        overflow="auto"
        height="90%"
        animate={{
          width: `${100 * width}%`,
        }}
        initial={false}
        transition={{ type: "tween" }}
        bgcolor={bgColor}
      />
    </Box>
  );
};

export default React.memo(VisualBar);
