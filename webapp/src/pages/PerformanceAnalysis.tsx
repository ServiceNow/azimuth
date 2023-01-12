import { Box, Typography } from "@mui/material";
import Description from "components/Description";
import PerformanceAnalysisTable from "components/Metrics/PerformanceAnalysisTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

export const performanceAnalysisDescription = (
  <Description
    text="Analyze metrics for different data subpopulations."
    link="user-guide/pipeline-metrics-comparison/"
  />
);

const PerformanceAnalysis = () => {
  const history = useHistory();
  const { jobId, datasetSplitName } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
  }>();
  const { pipeline, searchString } = useQueryState();

  const { data: datasetInfo, isFetching: isFetchingDatasetInfo } =
    getDatasetInfoEndpoint.useQuery({ jobId });

  const setDatasetSplitName = (name: DatasetSplitName) =>
    history.push(
      `/${jobId}/dataset_splits/${name}/pipeline_metrics${searchString}`
    );

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">
        Pipeline Metrics by Data Subpopulation
      </Typography>
      {performanceAnalysisDescription}
      {isPipelineSelected(pipeline) ? (
        <PerformanceAnalysisTable
          jobId={jobId}
          pipeline={pipeline}
          availableDatasetSplits={datasetInfo?.availableDatasetSplits}
          isLoading={isFetchingDatasetInfo}
          datasetSplitName={datasetSplitName}
          setDatasetSplitName={setDatasetSplitName}
        />
      ) : (
        <Typography>{PIPELINE_REQUIRED_TIP}</Typography>
      )}
    </Box>
  );
};

export default React.memo(PerformanceAnalysis);
