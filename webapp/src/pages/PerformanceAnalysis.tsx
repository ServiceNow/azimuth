import { Box, Typography } from "@mui/material";
import Description from "components/Description";
import PerformanceAnalysisComparisonTable from "components/Metrics/PerformanceAnalysisTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

export const performanceAnalysisDescription = (
  <Description
    text="Assess model performance through prediction metrics."
    link="/#performance-analysis"
  />
);

const PerformanceAnalysisComparison = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  const { data: datasetInfo, isFetching: isFetchingDatasetInfo } =
    getDatasetInfoEndpoint.useQuery({ jobId });

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">Performance Analysis</Typography>
      {performanceAnalysisDescription}
      {isPipelineSelected(pipeline) ? (
        <PerformanceAnalysisComparisonTable
          jobId={jobId}
          pipeline={pipeline}
          availableDatasetSplits={datasetInfo?.availableDatasetSplits}
          isLoading={isFetchingDatasetInfo}
        />
      ) : (
        <Typography>{PIPELINE_REQUIRED_TIP}</Typography>
      )}
    </Box>
  );
};

export default React.memo(PerformanceAnalysisComparison);
