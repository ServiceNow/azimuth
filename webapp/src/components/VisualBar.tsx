import React from "react";
import { Box, BoxProps, Typography } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  formattedValue: string;
  value: number;
  color: BoxProps["bgcolor"];
};

const VisualBar: React.FC<Props> = ({ formattedValue, value, color }) => (
  <Box width="100%" display="flex" gap={1}>
    <Typography align="right" variant="inherit" width={46}>
      {formattedValue}
    </Typography>
    <Box flex="1">
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
  </Box>
);

export default React.memo(VisualBar);
