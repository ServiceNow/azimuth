import { Box, Button, Typography } from "@mui/material";
import noData from "assets/void.svg";
import PerturbationTestingPreview from "components/Analysis/PerturbationTestingPreview";
import PreviewCard from "components/Analysis/PreviewCard";
import WarningsPreview from "components/Analysis/WarningsPreview";
import Description from "components/Description";
import Telescope from "components/Icons/Telescope";
import Loading from "components/Loading";
import PerformanceAnalysis from "components/Metrics/PerformanceAnalysis";
import ThresholdPlot from "components/ThresholdPlot";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { isPipelineSelected } from "utils/helpers";
import { behavioralTestingDescription } from "./PerturbationTestingSummary";
import { performanceAnalysisDescription } from "./PerformanceAnalysis";
import { postprocessingDescription } from "./Threshold";

const DEFAULT_PREVIEW_CONTENT_HEIGHT = 502;

const Dashboard = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline, searchString } = useQueryState();

  const {
    data: datasetInfo,
    error,
    isFetching,
  } = getDatasetInfoEndpoint.useQuery({ jobId });

  if (isFetching) {
    return <Loading />;
  } else if (error) {
    return (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="no dataset info" />
        <Typography>{error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        paddingX={4}
        paddingY={1}
      >
        <Box display="flex" flexDirection="column">
          <Typography variant="h2">Dashboard</Typography>
          <Description
            text="Explore the analyses of your datasets and pipelines."
            link="/"
          />
        </Box>
        <Button
          color="secondary"
          variant="contained"
          component={Link}
          to={`/${jobId}/dataset_splits/eval/prediction_overview${searchString}`}
          sx={{ gap: 1 }}
        >
          <Telescope fontSize="large" />
          Go to exploration space
        </Button>
      </Box>
      {datasetInfo?.availableDatasetSplits.train && (
        <PreviewCard
          title="Dataset Warnings"
          to={`/${jobId}/dataset_warnings${searchString}`}
          description={
            <Description
              text="Investigate issues related to class size, class imbalance, or dataset shift between your training and evaluation sets."
              link="/dataset-warnings/"
            />
          }
        >
          <Box height={DEFAULT_PREVIEW_CONTENT_HEIGHT}>
            <WarningsPreview jobId={jobId} />
          </Box>
        </PreviewCard>
      )}
      {isPipelineSelected(pipeline) && (
        <PreviewCard
          title="Pipeline Metrics by Data Subpopulation"
          to={`/${jobId}/pipeline_metrics${searchString}`}
          linkButtonText="Compare pipelines"
          description={performanceAnalysisDescription}
        >
          <PerformanceAnalysis
            jobId={jobId}
            pipeline={pipeline}
            availableDatasetSplits={datasetInfo?.availableDatasetSplits}
          />
        </PreviewCard>
      )}
      {isPipelineSelected(pipeline) &&
        datasetInfo?.perturbationTestingAvailable && (
          <PreviewCard
            title="Behavioral Testing"
            to={`/${jobId}/behavioral_testing_summary${searchString}`}
            description={behavioralTestingDescription}
          >
            <Box height={DEFAULT_PREVIEW_CONTENT_HEIGHT}>
              <PerturbationTestingPreview
                jobId={jobId}
                pipeline={pipeline}
                availableDatasetSplits={datasetInfo.availableDatasetSplits}
              />
            </Box>
          </PreviewCard>
        )}
      {isPipelineSelected(pipeline) &&
        datasetInfo?.postprocessingEditable?.[pipeline.pipelineIndex] && (
          <PreviewCard
            title="Post-processing Analysis"
            to={`/${jobId}/thresholds${searchString}`}
            description={postprocessingDescription}
          >
            <Box height={DEFAULT_PREVIEW_CONTENT_HEIGHT}>
              <ThresholdPlot jobId={jobId} pipeline={pipeline} />
            </Box>
          </PreviewCard>
        )}
    </Box>
  );
};

export default React.memo(Dashboard);
