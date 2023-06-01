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

  if (!config) {
    // Even if there is no pipeline selected, we wait for the config to load so
    // that all pages can assume that the config is loaded.
    return <Loading />;
  }

  return !isPipelineSelected(pipeline) ||
    (config.pipelines &&
      pipeline.pipelineIndex >= 0 &&
      pipeline.pipelineIndex < config.pipelines.length) ? (
    <>{children}</>
  ) : (
    <Redirect to={location.pathname} />
  );
};

export default React.memo(PipelineCheck);
