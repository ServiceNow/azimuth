import { alpha, Box, Typography, useTheme } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { getConfusionMatrixEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { QueryFilterState, QueryPipelineState } from "types/models";
import { OUTCOME_COLOR } from "utils/const";
import { classNames } from "utils/helpers";

const CONFUSION_ROW_OFFSET = 1;
const CONFUSION_COLUMN_OFFSET = 1;
const LABEL_WIDTH = 13;

type Props = {
  jobId: string;
  datasetSplitName: DatasetSplitName;
  filters: QueryFilterState;
  pipeline: Required<QueryPipelineState>;
  classOptions: string[];
  predictionFilters?: string[];
  labelFilters?: string[];
};

const useStyles = makeStyles((theme) => ({
  corner: {
    backgroundColor: theme.palette.background.paper,
    zIndex: 12,
    width: "100%",
    height: "100%",
  },
  verticalLabel: {
    transform: "rotate(180deg)",
    writingMode: "vertical-rl",
  },
  topStickyCell: {
    position: "sticky",
    top: 0,
  },
  leftStickyCell: {
    position: "sticky",
    left: 0,
  },
  filteredLabel: {
    color: theme.palette.text.disabled,
  },
  gridLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "default",
    width: "100%",
    height: "100%",
    lineHeight: 3,
    backgroundColor: theme.palette.background.paper,
    minHeight: "100%",
    minWidth: "100%",
    "&:hover": {
      width: "auto",
      height: "auto",
      overflow: "initial",
      zIndex: "1",
    },
  },
  rowLabel: {
    textAlign: "right",
    paddingRight: theme.spacing(1),
  },
  columnLabel: {
    paddingTop: theme.spacing(1),
  },
  cellPopover: {
    pointerEvents: "none",
  },
  popoverPaper: {
    padding: theme.spacing(1.5),
  },
}));

const ConfusionMatrix: React.FC<Props> = ({
  jobId,
  datasetSplitName,
  filters,
  pipeline,
  classOptions,
  predictionFilters,
  labelFilters,
}) => {
  const classes = useStyles();
  const theme = useTheme();

  const { data: { confusionMatrix } = { confusionMatrix: [] } } =
    getConfusionMatrixEndpoint.useQuery({
      jobId,
      datasetSplitName,
      ...filters,
      ...pipeline,
    });

  // Set to 1 if the maxCount is 0 so we don't divide by 0.
  // This is fine since all values will be 0 anyway in this case.
  const maxCount = Math.max(...confusionMatrix.flat()) || 1;

  return (
    <Box
      alignItems="center"
      display="flex"
      flexDirection="column"
      height="100%"
      justifyContent="center"
      minHeight={0}
      width="100%"
    >
      <Box
        alignItems="center"
        display="grid"
        gridTemplateColumns={`${theme.spacing(3)} ${theme.spacing(
          LABEL_WIDTH
        )}`}
        gridTemplateRows={`${theme.spacing(3)} ${theme.spacing(LABEL_WIDTH)}`}
        justifyItems="center"
        minHeight={200}
        minWidth={200}
      >
        <Typography variant="caption" sx={{ gridRow: 1, gridColumn: 3 }}>
          Prediction
        </Typography>
        <Typography
          className={classes.verticalLabel}
          sx={{ gridRow: 3, gridColumn: 1 }}
          variant="caption"
        >
          Label
        </Typography>
        <Box
          alignItems="center"
          display="inline-grid"
          gridAutoColumns={theme.spacing(3.5)}
          gridAutoFlow="row"
          gridAutoRows={theme.spacing(3.5)}
          gridColumn="2 / span 2"
          gridRow="2 / span 2"
          gridTemplateRows={theme.spacing(LABEL_WIDTH)}
          gridTemplateColumns={theme.spacing(LABEL_WIDTH)}
          height="100%"
          justifyItems="center"
          overflow="scroll"
          width="100%"
          sx={{
            // Stops accidental navigation on horizontal scroll with touch pad
            overscrollBehaviorX: "contain",
          }}
        >
          <Box
            className={classNames(
              classes.corner,
              classes.topStickyCell,
              classes.leftStickyCell
            )}
            gridColumn={CONFUSION_COLUMN_OFFSET}
            gridRow={CONFUSION_ROW_OFFSET}
          />

          {classOptions.flatMap((classOption, i) => [
            <Typography
              key={`column-${i}`}
              className={classNames(
                classes.gridLabel,
                classes.columnLabel,
                classes.verticalLabel,
                classes.topStickyCell,
                predictionFilters &&
                  !predictionFilters.includes(classOption) &&
                  classes.filteredLabel
              )}
              variant="caption"
              sx={{
                gridColumn: i + CONFUSION_COLUMN_OFFSET + 1,
                gridRow: 1,
              }}
            >
              {classOption}
            </Typography>,
            <Typography
              key={`row-${i}`}
              className={classNames(
                classes.gridLabel,
                classes.rowLabel,
                classes.leftStickyCell,
                labelFilters &&
                  !labelFilters.includes(classOption) &&
                  classes.filteredLabel
              )}
              variant="caption"
              sx={{
                gridRow: i + CONFUSION_ROW_OFFSET + 1,
                gridColumn: 1,
              }}
            >
              {classOption}
            </Typography>,
          ])}

          {confusionMatrix.flatMap((row, rowIndex) =>
            row.map((value, columnIndex) => (
              <Box
                key={`column-${columnIndex} row-${rowIndex}`}
                boxShadow={`0 0 0 0.35px ${theme.palette.divider}`}
                gridRow={rowIndex + CONFUSION_ROW_OFFSET + 1}
                gridColumn={columnIndex + CONFUSION_COLUMN_OFFSET + 1}
                height="100%"
                overflow="hidden"
                width="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{
                  backgroundColor: alpha(
                    theme.palette[
                      rowIndex === columnIndex
                        ? columnIndex === row.length - 1
                          ? OUTCOME_COLOR.CorrectAndRejected
                          : OUTCOME_COLOR.CorrectAndPredicted
                        : columnIndex === row.length - 1
                        ? OUTCOME_COLOR.IncorrectAndRejected
                        : OUTCOME_COLOR.IncorrectAndPredicted
                    ].main,
                    value / maxCount
                  ),
                }}
              >
                {value > 0 && (
                  <Typography
                    fontSize={12}
                    color={(theme) =>
                      theme.palette.common[value > 0.7 ? "white" : "black"]
                    }
                  >
                    {(value * 100).toFixed(0)}
                    <Typography
                      component="span"
                      fontSize="0.75em"
                      sx={{ verticalAlign: "0.25em" }}
                    >
                      %
                    </Typography>
                  </Typography>
                )}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ConfusionMatrix;
