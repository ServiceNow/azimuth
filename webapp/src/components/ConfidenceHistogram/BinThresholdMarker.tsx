import { Typography, alpha, Box } from "@mui/material";

type Props = {
  threshold: number;
};

const BinThresholdMarker: React.FC<Props> = ({ threshold }) => (
  <Box
    top={0}
    height="100%"
    left={`${threshold * 100}%`}
    position="absolute"
    width={0}
  >
    <Box
      borderLeft={(theme) =>
        `3px dashed ${alpha(theme.palette.common.black, 0.2)}`
      }
      height="100%"
      left={-1.5}
      position="relative"
    >
      <Typography
        fontSize={12}
        whiteSpace="nowrap"
        position="absolute"
        {...{ [threshold > 0.5 ? "right" : "left"]: 6 }}
      >
        {`Prediction threshold: ${threshold * 100}%`}
      </Typography>
    </Box>
  </Box>
);

export default BinThresholdMarker;
