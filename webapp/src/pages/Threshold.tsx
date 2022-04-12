import { Typography } from "@mui/material";
import ThresholdPlot from "components/ThresholdPlot";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

const Threshold = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  return isPipelineSelected(pipeline) ? (
    <ThresholdPlot jobId={jobId} pipeline={pipeline} />
  ) : (
    <Typography>{PIPELINE_REQUIRED_TIP}</Typography>
  );
};

export default React.memo(Threshold);
