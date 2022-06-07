import { Box, Button, Typography, Link } from "@mui/material";
import noData from "assets/void.svg";
import PerturbationTestingPreview from "components/Analysis/PerturbationTestingPreview";
import PreviewCard from "components/Analysis/PreviewCard";
import WarningsPreview from "components/Analysis/WarningsPreview";
import Telescope from "components/Icons/Telescope";
import Loading from "components/Loading";
import Description from "components/Description";
import PerformanceAnalysis from "components/Metrics/PerformanceAnalysis";
import ThresholdPlot from "components/ThresholdPlot";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { isPipelineSelected } from "utils/helpers";

const DEFAULT_PREVIEW_CONTENT_HEIGHT = 502;

const Dashboard = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { pipeline, searchString } = useQueryState();

  const { data, error, isFetching } = getDatasetInfoEndpoint.useQuery({
    jobId,
  });

  if (isFetching) {
    <Loading />;
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
            text="Explore the different analyses, highlighting consequential aspects
            of your dataset and model. "
            link="/user-guide/"
          />
        </Box>
        <Button
          color="secondary"
          variant="contained"
          component={RouterLink}
          to={`/${jobId}/dataset_splits/eval/performance_overview${searchString}`}
          sx={{ gap: 1 }}
        >
          <Telescope fontSize="large" />
          Go to exploration space
        </Button>
      </Box>
      {data?.availableDatasetSplits.train && (
        <PreviewCard
          title="Dataset Class Distribution Analysis"
          subtitle="Assess if your evaluation set has the same class distribution as the training set. "
          to={`/${jobId}/dataset_class_distribution_analysis${searchString}`}
          href="/user-guide/dataset-warnings/"
        >
          <Box height={DEFAULT_PREVIEW_CONTENT_HEIGHT}>
            <WarningsPreview jobId={jobId} />
          </Box>
        </PreviewCard>
      )}
      {isPipelineSelected(pipeline) && (
        <PreviewCard
          title="Performance Analysis"
          subtitle="Assess model performance through prediction outcomes and metrics. "
          href="/key-concepts/"
        >
          <PerformanceAnalysis jobId={jobId} pipeline={pipeline} />
        </PreviewCard>
      )}
      {isPipelineSelected(pipeline) && data?.perturbationTestingAvailable && (
        <PreviewCard
          title="Behavioral Testing"
          subtitle="Assess if your model is robust to small modifications. "
          to={`/${jobId}/behavioral_testing_summary${searchString}`}
          href="/key-concepts/behavioral-testing/"
        >
          <Box height={DEFAULT_PREVIEW_CONTENT_HEIGHT}>
            <PerturbationTestingPreview
              jobId={jobId}
              pipeline={pipeline}
              availableDatasetSplits={data.availableDatasetSplits}
            />
          </Box>
        </PreviewCard>
      )}
      {isPipelineSelected(pipeline) &&
        data?.postprocessingEditable?.[pipeline.pipelineIndex] && (
          <PreviewCard
            title="Post-processing Analysis"
            subtitle="View & select your optimal model performance confidence threshold, where you have the max correct and the min incorrect. * change your confidence threshold in the config file. "
            to={`/${jobId}/thresholds${searchString}`}
            href="/user-guide/post-processing-analysis/"
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
