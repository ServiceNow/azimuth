import { Badge, Box, Tooltip, Typography } from "@mui/material";
import React from "react";
import {
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
} from "utils/const";

const BADGE_DIAMETER = 14;

const SmartTagFamilyBadge: React.FC<{
  family: typeof SMART_TAG_FAMILIES[number];
  smartTags: string[];
  withName?: boolean;
}> = ({ family, smartTags, withName }) => (
  <Tooltip
    title={
      <>
        <Typography fontWeight="bold">
          {smartTags.length} {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
        </Typography>
        {smartTags.map((tag) => (
          <Typography key={tag}>{tag}</Typography>
        ))}
      </>
    }
  >
    <Box>
      <Badge
        badgeContent={smartTags.length}
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
          smartTags.length > 0 ? {} : { sx: { opacity: 0.12 } }
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
