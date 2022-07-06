import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  value: string;
  width: number;
  bgColor: string;
};

const VisualBar: React.FC<Props> = ({ value, width, bgColor }) => {
  return (
    <Box
      display="grid"
      gridAutoColumns={50}
      gridAutoFlow="column"
      alignItems="center"
    >
      {value}
      <Box
        component={motion.div}
        key={value}
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
