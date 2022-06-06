import {
  alpha,
  Box,
  Theme,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { getConfusionMatrixEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import {
  QueryFilterState,
  QueryConfusionMatrixState,
  QueryPipelineState,
  QueryPostprocessingState,
} from "types/models";
import { useHistory, useLocation } from "react-router-dom";
import { constructSearchString } from "utils/helpers";
import { OUTCOME_COLOR } from "utils/const";
import { classNames } from "utils/helpers";

const CONFUSION_ROW_OFFSET = 1;
const CONFUSION_COLUMN_OFFSET = 1;
const LABEL_LENGTH = "112px";
const CELL_SIZE = "28px";

type Props = {
  jobId: string;
  datasetSplitName: DatasetSplitName;
  filters: QueryFilterState;
  pipeline: Required<QueryPipelineState>;
  postprocessing: QueryPostprocessingState;
  classOptions: string[];
  predictionFilters?: string[];
  labelFilters?: string[];
  confusionMatrixState: QueryConfusionMatrixState;
};

const useStyles = makeStyles((theme) => ({
  corner: {
    backgroundColor: theme.palette.background.paper,
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
    backgroundColor: theme.palette.background.paper,
    minHeight: "100%",
    minWidth: "100%",
  },
  rowLabel: {
    textAlign: "right",
    padding: theme.spacing(1),
  },
  columnLabel: {
    padding: theme.spacing(1),
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
  postprocessing,
  classOptions,
  predictionFilters,
  labelFilters,
  confusionMatrixState,
}) => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const hoverStyle = (theme: Theme) => ({
    backgroundColor: alpha(
      theme.palette.secondary.main,
      theme.palette.action.selectedOpacity
    ),
  });

  const { data: { confusionMatrix, normalized } = { confusionMatrix: [] } } =
    getConfusionMatrixEndpoint.useQuery({
      jobId,
      datasetSplitName,
      ...filters,
      ...pipeline,
      ...postprocessing,
      ...confusionMatrixState,
    });

  // Set to 1 if the maxCount is 0 so we don't divide by 0.
  // This is fine since all values will be 0 anyway in this case.
  const maxCount = Math.max(...confusionMatrix.flat()) || 1;

  const handleNormalizedStateChange = (checked: boolean) =>
    history.push(
      `${location.pathname}${constructSearchString({
        ...filters,
        ...pipeline,
        ...postprocessing,
        normalized: checked && undefined,
      })}`
    );

  const renderCell = (value: number, rowIndex: number, columnIndex: number) => (
    <Box
      key={`column-${columnIndex} row-${rowIndex}`}
      className={`column-${columnIndex} row-${rowIndex}`}
      gridColumn={columnIndex + CONFUSION_COLUMN_OFFSET + 1}
      gridRow={rowIndex + CONFUSION_ROW_OFFSET + 1}
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={(theme) => ({
        backgroundColor: alpha(
          theme.palette[
            rowIndex === columnIndex
              ? columnIndex === classOptions.length - 1
                ? OUTCOME_COLOR.CorrectAndRejected
                : OUTCOME_COLOR.CorrectAndPredicted
              : columnIndex === classOptions.length - 1
              ? OUTCOME_COLOR.IncorrectAndRejected
              : OUTCOME_COLOR.IncorrectAndPredicted
          ].main,
          value / maxCount
        ),
      })}
    >
      {value > 0 && (
        <Typography
          fontSize={12}
          color={(theme) =>
            theme.palette.common[value > 0.7 ? "white" : "black"]
          }
        >
          {normalized ? (value * 100).toFixed(0) : value}
          <Typography
            component="span"
            fontSize="0.75em"
            sx={{ verticalAlign: "0.25em" }}
          >
            {normalized && `%`}
          </Typography>
        </Typography>
      )}
    </Box>
  );

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
      <Box marginLeft="auto">
        <FormControlLabel
          control={
            <Switch
              checked={normalized ?? true}
              onChange={(_, checked) => handleNormalizedStateChange(checked)}
            />
          }
          label="Normalize"
        />
      </Box>
      <Box
        alignItems="center"
        display="grid"
        gridTemplateColumns={`${CELL_SIZE} ${LABEL_LENGTH}`}
        gridTemplateRows={`${CELL_SIZE} ${LABEL_LENGTH}`}
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
          display="grid"
          gridColumn="2 / span 2"
          gridRow="2 / span 2"
          gridTemplateColumns={`${LABEL_LENGTH} repeat(${classOptions.length}, ${CELL_SIZE})`}
          gridTemplateRows={`${LABEL_LENGTH} repeat(${classOptions.length}, ${CELL_SIZE})`}
          height="100%"
          justifyItems="center"
          overflow="scroll"
          width="100%"
          sx={{
            // Stops accidental navigation on horizontal scroll with touch pad
            overscrollBehaviorX: "contain",
          }}
        >
          {confusionMatrix.flatMap((row, rowIndex) =>
            row.flatMap((value, columnIndex) =>
              value > 0 || rowIndex === columnIndex
                ? [renderCell(value, rowIndex, columnIndex)]
                : []
            )
          )}

          {classOptions.flatMap((classOption, i) => [
            <Typography
              key={`column-${i}`}
              className={classNames(
                `column-${i}`,
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
                [`&:hover, .column-${i}:hover ~ &`]: {
                  height: "auto",
                  overflow: "initial",
                },
              }}
            >
              {classOption}
            </Typography>,
            <Typography
              key={`row-${i}`}
              className={classNames(
                `row-${i}`,
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
                [`&:hover, .row-${i}:hover ~ &`]: {
                  width: "auto",
                  overflow: "initial",
                },
              }}
            >
              {classOption}
            </Typography>,
            <Box
              key={`grid-column-${i}`}
              gridColumn={i + CONFUSION_COLUMN_OFFSET + 1}
              gridRow={`2 / -1`}
              width="100%"
              height="100%"
              boxShadow={(theme) => `0 0 0 0.35px ${theme.palette.divider}`}
              sx={{
                pointerEvents: "none",
              }}
            />,
            <Box
              key={`grid-row-${i}`}
              gridColumn={`2 / -1`}
              gridRow={i + CONFUSION_ROW_OFFSET + 1}
              width="100%"
              height="100%"
              boxShadow={(theme) => `0 0 0 0.35px ${theme.palette.divider}`}
              sx={{
                pointerEvents: "none",
              }}
            />,
            <Box
              key={`hover-column-${i}`}
              gridColumn={i + CONFUSION_COLUMN_OFFSET + 1}
              gridRow={`1 / -1`}
              position="sticky"
              width="100%"
              height="100%"
              sx={{
                pointerEvents: "none",
                [`.column-${i}:hover ~ &`]: hoverStyle,
              }}
            />,
            <Box
              key={`hover-row-${i}`}
              gridColumn={`1 / -1`}
              gridRow={i + CONFUSION_ROW_OFFSET + 1}
              position="sticky"
              width="100%"
              height="100%"
              sx={{
                pointerEvents: "none",
                [`.row-${i}:hover ~ &`]: hoverStyle,
              }}
            />,
          ])}

          <Box
            className={classNames(
              classes.corner,
              classes.topStickyCell,
              classes.leftStickyCell
            )}
            gridColumn={CONFUSION_COLUMN_OFFSET}
            gridRow={CONFUSION_ROW_OFFSET}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ConfusionMatrix;
