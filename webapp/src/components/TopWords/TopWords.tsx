import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import useResizeObserver from "hooks/useResizeObserver";
import { WordCount } from "types/models";

const maxFontSizeInEm = 3.5;
const minFontSizeInEm = 1.2;
const minOpacity = 0.6;

type Props = {
  wordCounts: WordCount[];
  palette?: "success" | "error";
};

const TopWords: React.FC<Props> = ({ wordCounts, palette = "success" }) => {
  const theme = useTheme();

  // It is impossible to know how large the word cloud will end up being so we have to scale it down to fit the parent if it is too big
  const [contentRef, contentWidth, contentHeight] = useResizeObserver();
  const [wrapperRef, wrapperWidth, wrapperHeight] = useResizeObserver();

  const vscale = contentHeight > 0 ? wrapperHeight / contentHeight : 0;
  const hscale = contentWidth > 0 ? wrapperWidth / contentWidth : 0;

  const fitScale = Math.min(vscale, hscale);

  const normalizingScaleFactor =
    1 / Math.max(...wordCounts.map((wordCount) => wordCount.count));

  return (
    <Box
      ref={wrapperRef}
      height="100%"
      padding={1}
      width="100%"
      sx={{
        backgroundColor: theme.palette.grey[50],
      }}
    >
      <Box
        ref={contentRef}
        alignItems="baseline"
        display="flex"
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="center"
        minHeight={theme.spacing(2)}
        sx={{
          transform: `scale(${fitScale})`,
          transformOrigin: "top center",
        }}
      >
        {wordCounts.length === 0 ? (
          <Typography
            align="center"
            color={theme.palette.grey[400]}
            paddingTop="10%"
          >
            No word count data.
          </Typography>
        ) : (
          wordCounts.map((wordCount, index) => (
            <Typography
              key={index}
              color={theme.palette[palette].dark}
              display="block"
              fontSize={`${Math.max(
                maxFontSizeInEm * wordCount.count * normalizingScaleFactor,
                minFontSizeInEm
              )}em`}
              marginLeft={1}
              marginRight={1}
              sx={{
                opacity: Math.max(
                  wordCount.count * normalizingScaleFactor,
                  minOpacity
                ),
              }}
            >
              {`${wordCount.word} (${wordCount.count})`}
            </Typography>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TopWords;
