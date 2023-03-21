import { Typography, Box, Paper } from "@mui/material";
import Description from "components/Description";
import SmartTagsTable from "components/SmartTagsTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";

export const smartTagsDescription = (
  <Description
    text="Identify patterns between smart tags and classes."
    link="user-guide/smart-tag-analysis/"
  />
);

const SmartTags = () => {
  const history = useHistory();
  const { jobId, datasetSplitName } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
  }>();
  const { pipeline, searchString } = useQueryState();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const setDatasetSplitName = (name: DatasetSplitName) =>
    history.push(`/${jobId}/dataset_splits/${name}/smart_tags${searchString}`);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">Smart Tag Analysis</Typography>
      {smartTagsDescription}
      <Paper variant="outlined" sx={{ marginTop: 4, minHeight: 0, padding: 4 }}>
        <SmartTagsTable
          jobId={jobId}
          pipeline={pipeline}
          availableDatasetSplits={datasetInfo?.availableDatasetSplits}
          datasetSplitName={datasetSplitName}
          setDatasetSplitName={setDatasetSplitName}
        />
      </Paper>
    </Box>
  );
};

export default React.memo(SmartTags);
