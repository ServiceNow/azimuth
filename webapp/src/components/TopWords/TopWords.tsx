import React from "react";
import { Box, Link, Typography, useTheme } from "@mui/material";
import useResizeObserver from "hooks/useResizeObserver";
import {
  QueryConfusionMatrixState,
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
  WordCount,
} from "types/models";
import { Link as RouterLink } from "react-router-dom";
import { constructSearchString } from "utils/helpers";

const maxFontSizeInEm = 3;
const minFontSizeInEm = 1.2;
const minOpacity = 0.6;

type Props = {
  baseUrl: string;
  confusionMatrix: QueryConfusionMatrixState;
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: QueryPipelineState;
  postprocessing: QueryPostprocessingState;
  wordCounts: WordCount[];
  palette?: "success" | "error";
};

const TopWords: React.FC<Props> = ({
  baseUrl,
  confusionMatrix,
  filters,
  pagination,
  pipeline,
  postprocessing,
  wordCounts,
  palette = "success",
}) => {
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
          wordCounts.map(({ word, count }, index) => (
            <Link
              key={index}
              component={RouterLink}
              to={`${baseUrl}${constructSearchString({
                ...confusionMatrix,
                ...filters,
                utterance: filters.utterance === word ? undefined : word,
                ...pagination,
                ...pipeline,
                ...postprocessing,
              })}`}
              color={theme.palette[palette].dark}
              display="block"
              fontSize={`${Math.max(
                maxFontSizeInEm * count * normalizingScaleFactor,
                minFontSizeInEm
              )}em`}
              marginLeft={1}
              marginRight={1}
              sx={{
                opacity: Math.max(count * normalizingScaleFactor, minOpacity),
                textDecorationStyle:
                  filters.utterance === word ? "double" : undefined,
              }}
              whiteSpace="nowrap"
            >
              {`${word} (${count})`}
            </Link>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TopWords;
