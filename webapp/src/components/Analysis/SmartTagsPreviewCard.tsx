import { Box } from "@mui/material";
import SmartTagsTable from "components/SmartTagsTable";
import { smartTagsDescription } from "pages/SmartTags";
import React from "react";
import { AvailableDatasetSplits, DatasetSplitName } from "types/api";
import { QueryPipelineState } from "types/models";
import PreviewCard from "./PreviewCard";

const SmartTagsPreviewCard: React.FC<{
  jobId: string;
  pipeline: Required<QueryPipelineState>;
  searchString: string;
  availableDatasetSplits: AvailableDatasetSplits;
  defaultDatasetSplitName: DatasetSplitName;
}> = ({
  jobId,
  pipeline,
  searchString,
  availableDatasetSplits,
  defaultDatasetSplitName,
}) => {
  const [datasetSplitName, setDatasetSplitName] =
    React.useState<DatasetSplitName>(defaultDatasetSplitName);

  return (
    <PreviewCard
      title="Smart Tag Analysis"
      to={`/${jobId}/dataset_splits/${datasetSplitName}/smart_tags${searchString}`}
      description={smartTagsDescription}
    >
      <Box display="flex" flexDirection="column">
        <SmartTagsTable
          jobId={jobId}
          pipeline={pipeline}
          availableDatasetSplits={availableDatasetSplits}
          datasetSplitName={datasetSplitName}
          setDatasetSplitName={setDatasetSplitName}
        />
      </Box>
    </PreviewCard>
  );
};

export default React.memo(SmartTagsPreviewCard);
