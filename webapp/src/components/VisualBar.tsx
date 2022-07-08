import React from "react";
import { Box, BoxProps } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  formattedValue: string;
  value: number;
  color: BoxProps["bgcolor"];
};

const VisualBar: React.FC<Props> = ({ formattedValue, value, color }) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns="46px auto"
      width="100%"
      alignItems="center"
      textAlign="right"
      gap={1}
    >
      {formattedValue}
      <Box
        component={motion.div}
        key={formattedValue}
        overflow="auto"
        height="90%"
        animate={{
          width: `${value > 0 ? 100 * value : 0}%`,
        }}
        initial={false}
        transition={{ type: "tween" }}
        bgcolor={color}
      />
    </Box>
  );
};

export default React.memo(VisualBar);
