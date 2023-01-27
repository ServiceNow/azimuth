import { Typography } from "@mui/material";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { Redirect, useLocation, useParams } from "react-router-dom";
import { getConfigEndpoint } from "services/api";
import { isPipelineSelected } from "utils/helpers";
import Loading from "./Loading";

type Props = {
  children: React.ReactNode;
};

// Remove pipelineIndex query parameter if it is invalid
const PipelineCheck: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  const { data: config } = getConfigEndpoint.useQuery({ jobId });

  if (!isPipelineSelected(pipeline)) {
    // No need to check
    return <>{children}</>;
  }

  if (!config) {
    return (
      <>
        <Typography variant="h6" align="center">
          The startup tasks are completed and getting finalized at the back end.
          Please wait while the application is loaded.
        </Typography>
        <Loading />
      </>
    );
  }

  return config.pipelines &&
    pipeline.pipelineIndex >= 0 &&
    pipeline.pipelineIndex < config.pipelines.length ? (
    <>{children}</>
  ) : (
    <Redirect to={location.pathname} />
  );
};

export default React.memo(PipelineCheck);
