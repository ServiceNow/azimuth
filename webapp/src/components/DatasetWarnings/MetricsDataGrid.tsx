import React from "react";
import { Box, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { classNames } from "utils/helpers";
import { FormatType, DatasetDistributionComparison } from "types/api";

const useStyles = makeStyles((theme) => ({
  header: {
    position: "sticky",
    top: 0,
    backgroundColor: "inherit",
    zIndex: 10,
    borderBottom: `thin dotted ${theme.palette.divider}`,
    width: "100%",
  },
  alert: {
    color: theme.palette.warning.main,
    fontWeight: 700,
  },
  firstColumn: {
    textAlign: "left",
    justifySelf: "start",
    paddingRight: theme.spacing(4),
    padding: theme.spacing(0.5),
  },
  column: {
    textAlign: "right",
    padding: theme.spacing(0.25, 0.75, 0.25, 0.75),
  },
}));

const getFormatter = (format: FormatType) => {
  switch (format) {
    case "Decimal":
      return (data: number) => data.toFixed(2);
    case "Integer":
      return (data: number) => data;
    case "Percentage":
      return (data: number) => (100 * data).toFixed(0);
    default:
      return (data: number) => data;
  }
};

type Props = {
  columns: string[];
  rows: DatasetDistributionComparison[];
  format: FormatType;
};

const MetricsDataGrid = (props: Props) => {
  const classes = useStyles();
  const { columns, rows, format } = props;

  const nColumns = columns.length;
  const formatter = getFormatter(format);

  return (
    <Box
      display="inline-grid"
      gridTemplateColumns={`repeat(${nColumns}, min-content)`}
      justifyItems="end"
      paddingRight={2}
      position="relative"
      width="fit-content"
      sx={{ backgroundColor: "inherit", overflowY: "auto" }}
    >
      {columns.map((c, index) => (
        <React.Fragment key={`header-${index}`}>
          <Typography
            component="span"
            className={classNames(
              index === 0 ? classes.firstColumn : classes.column,
              classes.header
            )}
          >
            <strong>{c}</strong>
          </Typography>
        </React.Fragment>
      ))}
      {rows
        .filter((r) => r.alert)
        .map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <Typography
              className={classNames(classes.firstColumn, classes.column)}
            >
              {row.name}
            </Typography>
            {row.data.map((cell, cellIndex) => (
              <Typography
                key={cellIndex}
                className={classNames(
                  cell.alert && classes.alert,
                  classes.column
                )}
              >
                {cell.value !== null && cell.value !== undefined
                  ? formatter(cell.value)
                  : "-"}
              </Typography>
            ))}
          </React.Fragment>
        ))}
    </Box>
  );
};

export default MetricsDataGrid;
