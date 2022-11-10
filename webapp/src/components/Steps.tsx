import {
  Box,
  ToggleButton,
  toggleButtonClasses,
  Typography,
} from "@mui/material";
import React from "react";

const RADIUS = 4;
const WIDTH = 20;

const Steps: React.FC<{
  setStep: (value: number) => void;
  step: number;
  stepNames: string[];
  roundedStart?: true;
  roundedEnd?: true;
}> = ({ setStep, step, stepNames, roundedStart, roundedEnd }) => (
  // The stepName Typography has an absolute position to avoid making the button
  // group wider (and triggering hover styling) while still taking all the
  // available space relative to this outer Box
  <Box display="flex" position="relative">
    <Box display="flex" alignItems="center">
      {stepNames.map((stepName, i) => (
        <ToggleButton
          value={stepName}
          color="secondary"
          size="small"
          key={stepName}
          selected={i <= step}
          onClick={() => setStep(i)}
          sx={{
            bgcolor: "transparent !important",
            border: 0,
            borderRadius: 0, // Square hover hit box so it is impossible to hover the parent Box without hovering a button.
            paddingX: 0,
            "*:hover > &": {
              // As soon as one button is hovered, color all buttons dark blue.
              color: (theme) => theme.palette.secondary.dark,
            },
            [`&:hover ~ .${toggleButtonClasses.root}`]: {
              // And revert color of all buttons to the right of the one hovered to gray.
              color: (theme) => theme.palette.action.active,
            },
            "&:hover ~ .stepName::after": {
              content: `"${stepName}"`,
            },
          }}
        >
          <svg width={WIDTH} height={2 * RADIUS}>
            <path
              d={`${
                i === 0 && roundedStart
                  ? `M${RADIUS},0 a${RADIUS},${RADIUS} 0,0,0 0,${2 * RADIUS}`
                  : `M0,0 l${RADIUS},${RADIUS} ${-RADIUS},${RADIUS}`
              } H${WIDTH - RADIUS} ${
                i === stepNames.length - 1 && roundedEnd
                  ? `a${RADIUS},${RADIUS} 0,0,0 0,${-2 * RADIUS}`
                  : `l${RADIUS},${-RADIUS} ${-RADIUS},${-RADIUS}`
              } Z`}
              fill="currentcolor"
            />
          </svg>
        </ToggleButton>
      ))}
      <Typography
        variant="body2"
        className="stepName"
        noWrap
        position="absolute"
        left={stepNames.length * WIDTH}
        right={0}
        marginLeft={1}
        sx={{
          pointerEvents: "none",
          "&::after": {
            content: `"${stepNames[step]}"`,
          },
        }}
      />
    </Box>
  </Box>
);

export default React.memo(Steps);
