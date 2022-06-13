import { Badge, Box, Tooltip, Typography } from "@mui/material";
import React from "react";
import { Utterance } from "types/api";
import {
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
} from "utils/const";

const BADGE_DIAMETER = 14;

const SmartTagFamilyBadge: React.FC<{
  family: typeof SMART_TAG_FAMILIES[number];
  utterance: Utterance;
  withName?: boolean;
}> = ({ family, utterance, withName }) => (
  <Tooltip
    title={
      <>
        <Typography fontWeight="bold">
          {utterance[family].length} {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
        </Typography>
        {utterance[family].map((tag) => (
          <Typography key={tag}>{tag}</Typography>
        ))}
      </>
    }
  >
    <Box>
      <Badge
        badgeContent={utterance[family].length}
        color="secondary"
        sx={{
          "& .MuiBadge-badge": {
            borderRadius: BADGE_DIAMETER / 2,
            fontSize: 10,
            fontWeight: "bold",
            height: BADGE_DIAMETER,
            minWidth: BADGE_DIAMETER,
            paddingX: 0.5,
          },
        }}
      >
        {React.createElement(
          SMART_TAG_FAMILY_ICONS[family],
          utterance[family].length > 0 ? {} : { sx: { opacity: 0.12 } }
        )}
      </Badge>
      {withName && (
        <Typography
          component="span"
          fontSize={12}
          fontWeight="bold"
          marginLeft={1}
        >
          {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
        </Typography>
      )}
    </Box>
  </Tooltip>
);

export default SmartTagFamilyBadge;
