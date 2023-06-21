import { Info } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { getOutcomeCountPerThresholdEndpoint } from "services/api";
import { Outcome } from "types/api";
import { QueryPipelineState } from "types/models";
import { ALL_OUTCOMES, OUTCOME_COLOR, OUTCOME_PRETTY_NAMES } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { classNames } from "utils/helpers";

const yIntervals = 10;
const yTicks = Array.from(Array(yIntervals + 1), (_, i) => 1 - i / yIntervals);

const majorGridLines: { [y: number]: { tooltip: string; label: string } } = {
  0.9: {
    tooltip: "Red bar should ideally not exceed this line",
    label: "Target for Incorrect & Predicted",
  },
  0.7: {
    tooltip: "Green bars should ideally exceed this line",
    label: "Target for Correct",
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
  },
  xTitle: {
    gridRow: "title",
    gridColumn: "start / end",
  },
  xLabel: {
    gridRow: "label",
    justifySelf: "right",
    translate: "50%",
    marginTop: theme.spacing(1),
  },
  yTitle: {
    gridColumn: "title",
    gridRow: "start / end",
    transform: "rotate(180deg)",
    writingMode: "vertical-rl",
  },
}));

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
};

const GridLine: React.FC<
  ({ x: number; y?: never } | { x?: never; y: number }) & { dashed?: Boolean }
> = ({ x, y, dashed }) => (
  <Box
    component="line"
    strokeWidth={2}
    vectorEffect="non-scaling-stroke"
    x1={x ?? 0}
    x2={x ?? 1}
    y1={y ?? 0}
    y2={y ?? 1}
    sx={(theme) =>
      dashed
        ? { stroke: theme.palette.common.black, strokeDasharray: 5 }
        : { stroke: alpha(theme.palette.common.black, 0.2) }
    }
  />
);

const Point: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <Box
    component="path"
    d={`M${x},${y} Z`}
    strokeLinecap="round"
    strokeWidth={6}
    vectorEffect="non-scaling-stroke"
    sx={(theme) => ({ stroke: theme.palette.common.black })}
  />
);

const Curve: React.FC<{
  points: [number, number][];
  outcome: Outcome;
}> = ({ points, outcome }) => (
  <>
    <Box
      component="polyline"
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      // Go from -1 to 2 so the side strokes are outside the viewBox
      points={[[-1, 0], ...points, [2, 0]].join(" ")}
      sx={(theme) => ({
        fill: theme.palette[OUTCOME_COLOR[outcome]].main,
        stroke: theme.palette.common.black,
      })}
    />
    {points.map(([x, y], j) => (
      <Point key={j} x={x} y={y} />
    ))}
  </>
);

const ThresholdPlot: React.FC<Props> = ({ jobId, pipeline }) => {
  const classes = useStyles();

  const { data, error, isFetching } =
    getOutcomeCountPerThresholdEndpoint.useQuery({
      jobId,
      datasetSplitName: "eval",
      ...pipeline,
    });

  const xIntervals = (data?.outcomeCountPerThreshold.length || 2) - 1;

  const [background, ...curves] = ALL_OUTCOMES;
  const ys = data?.outcomeCountPerThreshold.map(({ outcomeCount }) =>
    curves
      // Relative to utterance count:
      .map((outcome) => [(outcomeCount[outcome] ?? 0) / data.utteranceCount])
      // Stack:
      .reduceRight(([first, ...rest], [y]) => [y + first, first, ...rest])
  );

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
              width={(theme) => theme.spacing(4)}
              bgcolor={(theme) => theme.palette[OUTCOME_COLOR[outcome]].main}
            />
            {OUTCOME_PRETTY_NAMES[outcome]}
          </Box>
        ))}
      </Box>
      <Box
        display="grid"
        gridTemplateColumns={`[title] auto [label tick] auto [start] repeat(${xIntervals}, [tick] 1fr) [end] auto`}
        gridTemplateRows={`[start] repeat(${yIntervals}, [tick] 1fr) [tick end label] auto [title] auto`}
        height="100%"
        marginTop={2}
        minHeight={0}
        maxHeight={600}
        maxWidth={1000}
        width="100%"
      >
        {data && ys && (
          <Box
            component="svg"
            gridColumn="start / end"
            gridRow="start / end"
            width="100%"
            height="100%"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            bgcolor={(theme) => theme.palette[OUTCOME_COLOR[background]].main}
          >
            {curves.map((outcome, i) => (
              <Curve
                key={outcome}
                points={data.outcomeCountPerThreshold.map(
                  ({ threshold }, j) => [threshold, ys[j][i]]
                )}
                outcome={outcome}
              />
            ))}
            {data.outcomeCountPerThreshold.flatMap(({ threshold }, i) =>
              threshold !== data.confidenceThreshold
                ? [<GridLine key={i} x={threshold} />]
                : []
            )}
            {/* Separate since the confidence threshold may fall not on a grid line */}
            {data?.confidenceThreshold && (
              <GridLine x={data.confidenceThreshold} dashed />
            )}
            {yTicks.map((y, i) => (
              <GridLine key={i} y={1 - y} dashed={y in majorGridLines} />
            ))}
          </Box>
        )}
        {data?.confidenceThreshold && (
          <Box
            gridColumn="start / end"
            gridRow="start / end"
            position="relative"
          >
            <Typography
              position="absolute"
              left={`${data.confidenceThreshold * 100}%`}
              bottom="100%"
              whiteSpace="nowrap"
            >
              {`Current prediction threshold: ${
                data.confidenceThreshold * 100
              }%`}
            </Typography>
          </Box>
        )}
        <Typography className={classNames(classes.title, classes.xTitle)}>
          Confidence Threshold
        </Typography>
        {data ? (
          data.outcomeCountPerThreshold.map(({ threshold }, i) => (
            <Typography
              key={`x label ${i}`}
              variant="body2"
              className={classes.xLabel}
              gridColumn={`${1 + i} tick`}
            >
              {formatRatioAsPercentageString(threshold, 0)}
            </Typography>
          ))
        ) : (
          <Typography
            variant="body2"
            className={classes.xLabel}
            gridColumn="1 tick"
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
          y in majorGridLines && (
            <Box
              key={`y label right ${i}`}
              gridColumn="end"
              gridRow={`${1 + i} tick`}
              display="flex"
              alignItems="center"
              height={0}
            >
              <Tooltip placement="top" title={majorGridLines[y].tooltip}>
                <Typography marginLeft={1}>
                  {majorGridLines[y].label}
                  <Info fontSize="small" sx={{ marginLeft: 1 }} />
                </Typography>
              </Tooltip>
            </Box>
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
