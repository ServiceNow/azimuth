import { Box, Typography } from "@mui/material";
import Description from "components/Description";
import PerturbationTestingSummaryTable from "components/PerturbationTestingSummary/PerturbationTestingSummaryTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

export const behavioralTestingDescription = (
  <Description
    text="Assess if your model is robust to small modifications."
    link="/behavioral-testing-summary/"
  />
);

const PerturbationTestingSummary = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  const { data: datasetInfo, isFetching: isFetchingDatasetInfo } =
    getDatasetInfoEndpoint.useQuery({ jobId });

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">Behavioral Testing Summary</Typography>
      {behavioralTestingDescription}
      {isPipelineSelected(pipeline) ? (
        <PerturbationTestingSummaryTable
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

export default React.memo(PerturbationTestingSummary);
