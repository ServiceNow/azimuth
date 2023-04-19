import { Box, Typography } from "@mui/material";
import noData from "assets/void.svg";
import Loading from "components/Loading";
import UtteranceDetails from "components/UtteranceDetails";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { getUtterancesEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { UNKNOWN_ERROR } from "utils/const";

const UtteranceDetailsPage = () => {
  const { jobId, utteranceId, datasetSplitName } = useParams<{
    jobId: string;
    utteranceId: string;
    datasetSplitName: DatasetSplitName;
  }>();
  const index = Number(utteranceId);
  const { pipeline } = useQueryState();

  const query = { jobId, datasetSplitName, indices: [index], ...pipeline };

  const { data, isFetching, error } = getUtterancesEndpoint.useQuery(query);

  // data will be defined while it isFetching after updating the
  // dataAction tag, in which case we want to render the utterance.
  if (data === undefined) {
    return isFetching ? (
      <Loading />
    ) : (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="error" />
        <Typography>{error?.message || UNKNOWN_ERROR}</Typography>
      </Box>
    );
  }

  return (
    <UtteranceDetails
      jobId={jobId}
      index={index}
      datasetSplitName={datasetSplitName}
      getUtterancesQueryState={query}
      utterance={data.utterances[0]}
      confidenceThreshold={data.confidenceThreshold}
    />
  );
};

export default React.memo(UtteranceDetailsPage);
