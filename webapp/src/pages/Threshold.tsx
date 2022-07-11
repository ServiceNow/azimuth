import { Box, Typography } from "@mui/material";
import Description from "components/Description";
import ThresholdPlot from "components/ThresholdPlot";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

export const postprocessingDescription = (
  <Description
    text="View prediction distribution for multiple thresholds to find the optimal one. You can change the confidence threshold in the config file."
    link="/post-processing-analysis/"
  />
);

const Threshold = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">Post-processing Analysis</Typography>
      {postprocessingDescription}
      <Box marginTop={4} flex={1}>
        {isPipelineSelected(pipeline) ? (
          <ThresholdPlot jobId={jobId} pipeline={pipeline} />
        ) : (
          <Typography>{PIPELINE_REQUIRED_TIP}</Typography>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(Threshold);
