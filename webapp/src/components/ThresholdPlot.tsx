import {
  CircularProgress,
  alpha,
  Tooltip,
  Typography,
  Box,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { getOutcomeCountPerThresholdEndpoint } from "services/api";
import { QueryPipelineState } from "types/models";
import { ALL_OUTCOMES, OUTCOME_COLOR, OUTCOME_PRETTY_NAMES } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { classNames } from "utils/helpers";

const yIntervals = 10;
const yTicks = Array.from(Array(yIntervals + 1), (_, i) => 1 - i / yIntervals);

const majorGridLines: { [y: number]: { tooltip: string; label: string } } = {
  0.9: {
    tooltip: "Red bar should not exceed this line to meet goals",
    label: "Max Incorrect",
  },
  0.7: {
    tooltip: "Green bar should exceed this line to meet goals",
    label: "Min Correct",
  },
};

const useStyles = makeStyles((theme) => ({
  title: {
    textAlign: "center",
  },
  plotArea: {
    display: "flex",
    gridColumn: "start / end",
    gridRow: "start / end",
    placeSelf: "center",
    "p&": {
      backgroundColor: theme.palette.background.paper,
      padding: theme.spacing(),
    },
  },
  xTitle: {
    gridRow: "title",
    gridColumn: "start / end",
  },
  xLabel: {
    gridRow: "label",
    justifySelf: "center",
    marginTop: theme.spacing(1),
    minWidth: 0,
  },
  yTitle: {
    gridColumn: "title",
    gridRow: "start / end",
    transform: "rotate(180deg)",
    writingMode: "vertical-rl",
  },
  majorGridLine: {
    borderTop: `2px dashed ${theme.palette.common.black}`,
    width: "100%",
  },
  minorGridLine: {
    borderTop: `2px solid ${alpha(theme.palette.common.black, 0.2)}`,
    width: "100%",
  },
}));

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
};

const ThresholdPlot: React.FC<Props> = ({ jobId, pipeline }) => {
  const classes = useStyles();

  const { data, error, isFetching } =
    getOutcomeCountPerThresholdEndpoint.useQuery({
      jobId,
      datasetSplitName: "eval",
      ...pipeline,
    });

  const xIntervals = data?.length || 1;

  return (
    <Box
      alignItems="center"
      display="flex"
      flexDirection="column"
      gap={2}
      height="100%"
      minHeight={350}
      minWidth={700}
    >
      <Typography variant="h4" className={classes.title}>
        Distribution of the Predictions on Evaluation Set for Multiple
        Thresholds
      </Typography>
      <Box display="flex" gap={6} justifyContent="center" width="100%">
        {ALL_OUTCOMES.map((outcome) => (
          <Box key={outcome} display="flex" gap={1} lineHeight={1}>
            <Box
              sx={(theme) => ({
                backgroundColor: theme.palette[OUTCOME_COLOR[outcome]].main,
                width: theme.spacing(4),
              })}
            />
            {OUTCOME_PRETTY_NAMES[outcome]}
          </Box>
        ))}
      </Box>
      <Box
        display="grid"
        gridTemplateColumns={`[title] auto [label] auto [start] repeat(${xIntervals}, [tick] 1fr) [end] auto`}
        gridTemplateRows={`[start] repeat(${yIntervals}, [tick] 1fr) [tick end label] auto [title] auto`}
        height="100%"
        maxHeight={600}
        maxWidth={1000}
        width="100%"
      >
        <Typography className={classNames(classes.title, classes.xTitle)}>
          Confidence Threshold
        </Typography>
        {data ? (
          data.flatMap(({ outcomeCount, threshold }, i) => [
            <Typography
              key={`x label ${i}`}
              variant="body2"
              className={classes.xLabel}
              gridColumn={`${1 + i} tick`}
            >
              {formatRatioAsPercentageString(threshold, 0)}
            </Typography>,
            <Box
              key={`column ${i}`}
              display="flex"
              flexDirection="column-reverse"
              gridColumn={`${1 + i} tick`}
              gridRow="start / end"
              height="100%"
              justifySelf="center"
              width="80%"
            >
              {ALL_OUTCOMES.map((outcome) => (
                <Box
                  key={outcome}
                  flex={outcomeCount[outcome] || 0}
                  sx={(theme) => ({
                    backgroundColor: theme.palette[OUTCOME_COLOR[outcome]].main,
                  })}
                />
              ))}
            </Box>,
          ])
        ) : (
          <Typography
            variant="body2"
            className={classes.xLabel}
            sx={{ gridColumn: `1 tick` }}
          >
            {"\u200B" /* zero-width space to give the row the correct height */}
          </Typography>
        )}
        <Typography className={classNames(classes.title, classes.yTitle)}>
          % of Utterances in Evaluation Set
        </Typography>
        {yTicks.flatMap((y, i) => [
          <Typography
            key={`y label left ${i}`}
            variant="body2"
            gridColumn="label"
            gridRow={`${1 + i} tick`}
            lineHeight={0}
            marginRight={1}
            textAlign="right"
          >
            {formatRatioAsPercentageString(y, 0)}
          </Typography>,
          <Box
            key={`grid line ${i}`}
            alignItems="center"
            display="flex"
            gridColumn="start / end"
            gridRow={`${1 + i} tick`}
            height={0}
          >
            <Box
              className={
                y in majorGridLines
                  ? classes.majorGridLine
                  : classes.minorGridLine
              }
            />
          </Box>,
          y in majorGridLines && (
            <Tooltip
              key={`y label right ${i}`}
              placement="top"
              title={majorGridLines[y].tooltip}
            >
              <Typography
                gridColumn="end"
                gridRow={`${1 + i} tick`}
                lineHeight={0}
                marginLeft={1}
              >
                {majorGridLines[y].label}
              </Typography>
            </Tooltip>
          ),
        ])}
        {isFetching ? (
          <Box className={classes.plotArea}>
            <CircularProgress />
          </Box>
        ) : (
          error && (
            <Typography variant="body2" className={classes.plotArea}>
              {error.message}
            </Typography>
          )
        )}
      </Box>
    </Box>
  );
};

export default React.memo(ThresholdPlot);
