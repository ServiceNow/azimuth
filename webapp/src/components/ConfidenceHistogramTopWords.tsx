import React from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ConfidenceHistogram from "components/ConfidenceHistogram/ConfidenceHistogram";
import { DatasetSplitName } from "types/api";
import {
  getConfidenceHistogramEndpoint,
  getDatasetInfoEndpoint,
  getTopWordsEndpoint,
} from "services/api";
import TopWords from "components/TopWords/TopWords";
import TopWordsSkeleton from "components/TopWords/TopWordsSkeleton";
import {
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  WordCount,
} from "types/models";
import { ALL_OUTCOMES } from "utils/const";

type Props = {
  baseUrl: string;
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: Required<QueryPipelineState>;
};

const ConfidenceHistogramTopWords: React.FC<Props> = ({
  baseUrl,
  filters,
  pagination,
  pipeline,
}) => {
  const { jobId, datasetSplitName } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
  }>();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const {
    outcomes = ALL_OUTCOMES,
    confidenceMin = 0,
    confidenceMax = 1,
    ...filtersWithoutBins
  } = filters;

  const {
    data: bins,
    isFetching: isFetchingConfidenceHistogram,
    error,
  } = getConfidenceHistogramEndpoint.useQuery({
    jobId,
    datasetSplitName,
    ...filtersWithoutBins,
    ...pipeline,
  });

  const threshold = datasetInfo?.defaultThreshold?.[pipeline.pipelineIndex];

  const { data: topWords, isFetching: isFetchingTopWords } =
    getTopWordsEndpoint.useQuery({
      jobId,
      datasetSplitName,
      ...filters,
      ...pipeline,
    });

  const topWordsCounts = topWords;
  const correctWordCounts: WordCount[] = topWordsCounts?.right || [];
  const errorWordCounts: WordCount[] = topWordsCounts?.errors || [];

  return (
    <Box display="flex" gap={4} minHeight={0} maxHeight={600} height="100%">
      <ConfidenceHistogram
        isFetching={isFetchingConfidenceHistogram}
        error={error?.message}
        bins={bins}
        confidenceMin={confidenceMin}
        confidenceMax={confidenceMax}
        filteredOutcomes={outcomes}
        threshold={threshold}
      />
      <Box
        display="grid"
        height="100%"
        width={400}
        gridTemplateRows="auto minmax(0, 1fr) auto minmax(0, 1fr)"
        gridTemplateColumns="100%"
        gap={1}
      >
        <Typography display="inline" align="center" variant="caption">
          Counts of most {topWords?.importanceCriteria ?? "important"} words for
          correct predictions
        </Typography>

        {isFetchingTopWords ? (
          <TopWordsSkeleton />
        ) : (
          <TopWords
            baseUrl={baseUrl}
            filters={filters}
            pagination={pagination}
            pipeline={pipeline}
            wordCounts={correctWordCounts}
            palette="success"
          />
        )}
        <Typography display="inline" align="center" variant="caption">
          Counts of most {topWords?.importanceCriteria ?? "important"} words for
          incorrect predictions
        </Typography>
        {isFetchingTopWords ? (
          <TopWordsSkeleton />
        ) : (
          <TopWords
            baseUrl={baseUrl}
            filters={filters}
            pagination={pagination}
            pipeline={pipeline}
            wordCounts={errorWordCounts}
            palette="error"
          />
        )}
      </Box>
    </Box>
  );
};

export default React.memo(ConfidenceHistogramTopWords);
