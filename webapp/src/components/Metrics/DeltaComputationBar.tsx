import React from "react";
import { alpha, Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

type Props = {
  value: number;
  formattedValue: string | number;
  width: number;
};

const DeltaComputationBar: React.FC<Props> = ({
  value,
  formattedValue,
  width,
}) => {
  return (
    <Box display="flex" position="relative" height="100%" width="100%">
      <Box
        position="absolute"
        height="100%"
        width={0}
        borderLeft={(theme) =>
          `1px solid ${alpha(theme.palette.common.black, 0.2)}`
        }
        sx={{
          zIndex: 1,
          left: "50%",
          transform: "translateX(-0.5px)",
        }}
      ></Box>
      {value ? (
        <Box width="100%" flex="1" position="relative" marginY={1}>
          <Box
            component={motion.div}
            position="absolute"
            overflow="auto"
            height="100%"
            bgcolor={(theme) =>
              value >= 0
                ? alpha(theme.palette.secondary.light, 0.8)
                : alpha(theme.palette.primary.main, 0.6)
            }
            animate={{
              width: `${width}%`,
              ...(value < 0 ? { right: `50%` } : { left: "50%" }),
            }}
            initial={false}
            transition={{ type: "tween" }}
          ></Box>

          <Typography
            position="absolute"
            sx={{
              ...(value > 0 ? { right: "55%" } : { left: "55%" }),
            }}
            variant="inherit"
            color={(theme) =>
              value > 0
                ? theme.palette.secondary.dark
                : theme.palette.primary.main
            }
            fontWeight="bold"
          >
            {value > 0 ? `+${formattedValue}` : formattedValue}
          </Typography>
        </Box>
      ) : (
        <Typography
          position="absolute"
          sx={{
            right: "55%",
          }}
          variant="inherit"
          color={(theme) => theme.palette.primary.main}
        >
          0
        </Typography>
      )}
    </Box>
  );
};
export default DeltaComputationBar;
