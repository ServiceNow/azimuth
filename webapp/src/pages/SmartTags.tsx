import { Typography, Box, Paper } from "@mui/material";
import Description from "components/Description";
import SmartTagsTable from "components/SmartTagsTable";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

export const smartTagsDescription = (
  <Description
    text="Identify patterns between smart tags and classes."
    link="/#smart-tag-analysis"
  />
);

const SmartTags = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline } = useQueryState();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h4">Smart Tag Analysis</Typography>
      {smartTagsDescription}
      {isPipelineSelected(pipeline) ? (
        <Paper
          variant="outlined"
          sx={{ marginTop: 4, minHeight: 0, padding: 4 }}
        >
          <SmartTagsTable
            jobId={jobId}
            pipeline={pipeline}
            availableDatasetSplits={datasetInfo?.availableDatasetSplits}
          />
        </Paper>
      ) : (
        <Typography>{PIPELINE_REQUIRED_TIP}</Typography>
      )}
    </Box>
  );
};

export default React.memo(SmartTags);
