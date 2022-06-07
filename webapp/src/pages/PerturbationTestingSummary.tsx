import { Box, Typography } from "@mui/material";
import PerturbationTestingSummaryTable from "components/PerturbationTestingSummary/PerturbationTestingSummaryTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import Description from "components/Description";
import { useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

const PerturbationTestingSummary = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();
  const DOCS_URL = "https://servicenow.github.io/azimuth";
  const { data: datasetInfo, isFetching: isFetchingDatasetInfo } =
    getDatasetInfoEndpoint.useQuery({ jobId });

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4" paddingBottom={2}>
        Behavioral Testing Summary
      </Typography>
      <Description
        text="Azimuth auto runs perturbations on your dataset to help you assess if
        your model is robust to small perturbations (e.g. punctuation changes,
        misspellings and more). "
        link="/user-guide/"
      />
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
