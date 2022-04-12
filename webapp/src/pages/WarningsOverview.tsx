import React from "react";
import { useParams } from "react-router-dom";
import DatasetDistribution from "components/DatasetWarnings/DatasetDistribution";
import { getDatasetWarningsEndpoint } from "services/api";
import { Typography } from "@mui/material";

const WarningsOverview = () => {
  const { jobId } = useParams<{ jobId: string }>();

  const {
    data: datasetWarningGroups,
    isFetching,
    isSuccess,
    error,
  } = getDatasetWarningsEndpoint.useQuery({
    jobId,
  });

  if (error) {
    return <Typography>{error.message}</Typography>;
  }

  return (
    <DatasetDistribution
      isFetching={isFetching}
      isSuccess={isSuccess}
      datasetWarningGroups={datasetWarningGroups}
    />
  );
};

export default React.memo(WarningsOverview);
