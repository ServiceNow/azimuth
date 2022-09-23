import React from "react";
import VisualBar from "components/VisualBar";
import { formatRatioAsPercentageString } from "utils/format";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  value: number;
};

const DeltaComputationBars: React.FC<Props> = ({ value }) => {
  console.log(formatRatioAsPercentageString(value, 1));
  return (
    // <Box
    //   width="100%"
    //   display="flex"
    //   gap={1}
    //   flexDirection={value <= 0 ? "row-reverse" : "row"}
    //   marginLeft={1}
    // >
    //    <Box flex="1">
    <Box
      display="flex"
      flexDirection={value <= 0 ? "row-reverse" : "row"}
      component={motion.div}
      key={formatRatioAsPercentageString(value, 1)}
      overflow="auto"
      justifyContent={value < 0 ? `right` : `left`}
      height="90%"
      marginRight={1}
      // marginLeft={1}
      animate={{
        width: `${value > 0 ? 100 * value : 0}%`,
      }}
      initial={false}
      transition={{ type: "tween" }}
      bgcolor={(theme) => theme.palette.primary.light}
    />
    //    </Box>
    // </Box>
  );
};
export default DeltaComputationBars;
