import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { ResponsivePlotWrapper } from "components/PlotWrapper";
import React from "react";
import { getMetricsEndpoint, getCustomMetricInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import {
  QueryFilterState,
  QueryPipelineState,
  QueryPostprocessingState,
} from "types/models";
import { ECE_TOOLTIP, OUTCOME_COLOR, OUTCOME_PRETTY_NAMES } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import Metric from "./Metric";
import MetricsCard from "./MetricsCard";

// This is a special order, different from ALL_OUTCOMES
const OUTCOMES = [
  "CorrectAndRejected",
  "IncorrectAndRejected",
  "CorrectAndPredicted",
  "IncorrectAndPredicted",
] as const;

const OUTCOME_DESCRIPTIONS = {
  CorrectAndPredicted:
    "The predicted class matches the label and is not the rejection class.",
  CorrectAndRejected:
    "The predicted class and the label are the rejection class.",
  IncorrectAndRejected:
    "The predicted class is the rejection class, but not the label.",
  IncorrectAndPredicted:
    "The predicted class does not match the label and is not the rejection class.",
};

type Props = {
  jobId: string;
  datasetSplitName: DatasetSplitName;
  filters: QueryFilterState;
  pipeline: Required<QueryPipelineState>;
  postprocessing: QueryPostprocessingState;
};

const Metrics: React.FC<Props> = ({
  jobId,
  datasetSplitName,
  filters,
  pipeline,
  postprocessing,
}) => {
  const theme = useTheme();

  const { data: metrics, isFetching } = getMetricsEndpoint.useQuery({
    jobId,
    datasetSplitName,
    ...filters,
    ...pipeline,
    ...postprocessing,
  });

  const { data: metricsInfo } = getCustomMetricInfoEndpoint.useQuery({ jobId });

  const metricsInfoEntries = React.useMemo(() => {
    return metricsInfo && Object.entries(metricsInfo);
  }, [metricsInfo]);

  return (
    <Box
      display="flex"
      flexDirection="row"
      flexShrink={0}
      gap={4}
      overflow="auto visible"
    >
      <MetricsCard rowCount={2}>
        {OUTCOMES.map((outcome) => (
          <Metric
            key={outcome}
            isLoading={isFetching}
            value={
              metrics &&
              formatRatioAsPercentageString(
                metrics.outcomeCount[outcome] / metrics.utteranceCount,
                1
              )
            }
            name={OUTCOME_PRETTY_NAMES[outcome]}
            description={
              !isFetching && metrics
                ? `${metrics.outcomeCount[outcome]} out of ${metrics.utteranceCount} utterances\n${OUTCOME_DESCRIPTIONS[outcome]}`
                : OUTCOME_DESCRIPTIONS[outcome]
            }
            color={theme.palette[OUTCOME_COLOR[outcome]].main}
          />
        ))}
      </MetricsCard>
      {metricsInfoEntries && metricsInfoEntries.length > 0 && (
        <MetricsCard>
          {metricsInfoEntries.map(([metricName, { description }]) => (
            <Metric
              key={metricName}
              flexDirection="column"
              isLoading={isFetching}
              value={
                metrics &&
                formatRatioAsPercentageString(
                  metrics.customMetrics[metricName],
                  1
                )
              }
              name={metricName}
              description={description}
            />
          ))}
        </MetricsCard>
      )}
      <MetricsCard
        popover={
          <Box
            width={600}
            height={450}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {isFetching ? (
              <CircularProgress />
            ) : metrics?.ecePlot ? (
              <ResponsivePlotWrapper {...metrics.ecePlot} />
            ) : (
              <Typography>ECE plot unavailable</Typography>
            )}
          </Box>
        }
      >
        <Metric
          flexDirection="column"
          isLoading={isFetching}
          value={metrics?.ece.toFixed(2)}
          name="ECE"
          description={
            metrics?.ecePlot
              ? `${ECE_TOOLTIP}\nThis ECE is computed using ${metrics?.ecePlot?.data[0].x.length} bins.`
              : ECE_TOOLTIP
          }
        />
      </MetricsCard>
    </Box>
  );
};

export default React.memo(Metrics);
