import PerformanceAnalysis from "components/Metrics/PerformanceAnalysis";
import { performanceAnalysisDescription } from "pages/PerformanceAnalysis";
import React from "react";
import { AvailableDatasetSplits, DatasetSplitName } from "types/api";
import { QueryPipelineState } from "types/models";
import PreviewCard from "./PreviewCard";

const PerformanceAnalysisPreviewCard: React.FC<{
  jobId: string;
  pipeline: Required<QueryPipelineState>;
  searchString: string;
  availableDatasetSplits: AvailableDatasetSplits;
  defaultDatasetSplitName: DatasetSplitName;
  linkButtonText?: string;
}> = ({
  jobId,
  pipeline,
  searchString,
  availableDatasetSplits,
  defaultDatasetSplitName,
  linkButtonText,
}) => {
  const [datasetSplitName, setDatasetSplitName] =
    React.useState<DatasetSplitName>(defaultDatasetSplitName);

  return (
    <PreviewCard
      title="Pipeline Metrics by Data Subpopulation"
      to={`/${jobId}/dataset_splits/${datasetSplitName}/pipeline_metrics${searchString}`}
      linkButtonText={linkButtonText}
      description={performanceAnalysisDescription}
      autoHeight
    >
      <PerformanceAnalysis
        jobId={jobId}
        pipeline={pipeline}
        availableDatasetSplits={availableDatasetSplits}
        datasetSplitName={datasetSplitName}
        setDatasetSplitName={setDatasetSplitName}
      />
    </PreviewCard>
  );
};

export default React.memo(PerformanceAnalysisPreviewCard);
