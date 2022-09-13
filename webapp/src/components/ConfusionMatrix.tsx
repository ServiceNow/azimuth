import {
  alpha,
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Theme,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import noData from "assets/void.svg";
import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import { getConfusionMatrixEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import {
  QueryConfusionMatrixState,
  QueryFilterState,
  QueryPipelineState,
  QueryPostprocessingState,
} from "types/models";
import { OUTCOME_COLOR, UNKNOWN_ERROR } from "utils/const";
import { classNames, constructSearchString } from "utils/helpers";
import Loading from "./Loading";

const CONFUSION_ROW_OFFSET = 1;
const CONFUSION_COLUMN_OFFSET = 1;
const LABEL_LENGTH = "112px";
const CELL_SIZE = "28px";

type Props = {
  jobId: string;
  datasetSplitName: DatasetSplitName;
  confusionMatrix: QueryConfusionMatrixState;
  filters: QueryFilterState;
  pipeline: Required<QueryPipelineState>;
  postprocessing: QueryPostprocessingState;
  predictionFilters?: string[];
  labelFilters?: string[];
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
  confusionMatrix,
  filters,
  pipeline,
  postprocessing,
  predictionFilters,
  labelFilters,
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

  const { data, isLoading, isFetching, error } =
    getConfusionMatrixEndpoint.useQuery({
      jobId,
      datasetSplitName,
      ...confusionMatrix,
      ...filters,
      ...pipeline,
      ...postprocessing,
    });

  if (isLoading) {
    return <Loading />;
  } else if (error || data === undefined) {
    return (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="no dataset info" />
        <Typography>{error?.message || UNKNOWN_ERROR}</Typography>
      </Box>
    );
  }

  const matrix = data.confusionMatrix as number[][];

  // Set to 1 if the maxCount is 0 so we don't divide by 0.
  // This is fine since all values will be 0 anyway in this case.
  const maxCount = Math.max(...matrix.flat()) || 1;

  const handleStateChange = (newConfusionMatrix: QueryConfusionMatrixState) =>
    history.push(
      `${location.pathname}${constructSearchString({
        ...confusionMatrix,
        ...filters,
        ...pipeline,
        ...postprocessing,
        ...newConfusionMatrix,
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
            OUTCOME_COLOR[
              `${rowIndex === columnIndex ? "Correct" : "Incorrect"}And${
                data.classNames[columnIndex] === data.rejectionClass
                  ? "Rejected"
                  : "Predicted"
              }`
            ]
          ].main,
          value / maxCount
        ),
      })}
    >
      {value > 0 && (
        <Typography
          fontSize={12}
          color={(theme) =>
            theme.palette.common[value / maxCount > 0.7 ? "white" : "black"]
          }
        >
          {data.normalize ? (
            <>
              {(value * 100).toFixed(0)}
              <Typography
                component="span"
                fontSize="0.75em"
                sx={{ verticalAlign: "0.25em" }}
              >
                %
              </Typography>
            </>
          ) : (
            value
          )}
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
      <FormGroup sx={{ marginLeft: "auto" }}>
        <FormControlLabel
          control={
            <Switch
              checked={data.normalize}
              onChange={(_, checked) =>
                handleStateChange({ normalize: checked && undefined })
              }
            />
          }
          label="Normalize"
          labelPlacement="start"
        />
        <FormControlLabel
          control={
            <Switch
              checked={data.preserveClassOrder}
              onChange={(_, checked) =>
                handleStateChange({ preserveClassOrder: checked || undefined })
              }
            />
          }
          label="Preserve user-provided class order"
          labelPlacement="start"
        />
      </FormGroup>
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
          gridTemplateColumns={`${LABEL_LENGTH} repeat(${data.classNames.length}, ${CELL_SIZE})`}
          gridTemplateRows={`${LABEL_LENGTH} repeat(${data.classNames.length}, ${CELL_SIZE})`}
          height="100%"
          justifyItems="center"
          overflow="auto"
          width="100%"
          sx={{
            // Stops accidental navigation on horizontal scroll with touch pad
            overscrollBehaviorX: "contain",
          }}
        >
          {matrix.flatMap((row, rowIndex) =>
            row.flatMap((value, columnIndex) =>
              value > 0 || rowIndex === columnIndex
                ? [renderCell(value, rowIndex, columnIndex)]
                : []
            )
          )}

          {data.classNames.flatMap((className, i) => [
            <Typography
              key={`column-${i}`}
              className={classNames(
                `column-${i}`,
                classes.gridLabel,
                classes.columnLabel,
                classes.verticalLabel,
                classes.topStickyCell,
                predictionFilters &&
                  !predictionFilters.includes(className) &&
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
              {className}
            </Typography>,
            <Typography
              key={`row-${i}`}
              className={classNames(
                `row-${i}`,
                classes.gridLabel,
                classes.rowLabel,
                classes.leftStickyCell,
                labelFilters &&
                  !labelFilters.includes(className) &&
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
              {className}
            </Typography>,
            <Box
              key={`grid-column-${i}`}
              gridColumn={i + CONFUSION_COLUMN_OFFSET + 1}
              gridRow="2 / -1"
              width="100%"
              height="100%"
              boxShadow={(theme) => `0 0 0 0.35px ${theme.palette.divider}`}
              sx={{
                pointerEvents: "none",
              }}
            />,
            <Box
              key={`grid-row-${i}`}
              gridColumn="2 / -1"
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
              gridRow="1 / -1"
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
              gridColumn="1 / -1"
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
        {isFetching && <Loading gridColumn="-1" gridRow="-1" />}
      </Box>
    </Box>
  );
};

export default ConfusionMatrix;
