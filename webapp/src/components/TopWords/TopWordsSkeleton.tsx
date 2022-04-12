import React from "react";
import { Box, Skeleton, useTheme } from "@mui/material";

const GAP = 2;

type Props = { rowCount?: number; wordWidthMaxMinRatio?: number };

const TopWordsSkeleton = ({
  rowCount = 4,
  wordWidthMaxMinRatio = 6,
}: Props) => {
  const theme = useTheme();

  const randomness = wordWidthMaxMinRatio - 1;
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={GAP}
      height="100%"
      padding={GAP}
      width="100%"
      sx={{
        backgroundColor: theme.palette.grey[50],
      }}
    >
      {Array.from(Array(rowCount), (_, row) => (
        <Box
          key={row}
          display="flex"
          gap={GAP}
          // Every row is sqrt(2) times thinner than the previous row.
          flex={Math.SQRT1_2 ** row}
        >
          {Array.from(Array(row + 1), (_, word) => (
            <Skeleton
              key={word}
              sx={{ flex: 1 + randomness * Math.random(), transform: "none" }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default React.memo(TopWordsSkeleton);
