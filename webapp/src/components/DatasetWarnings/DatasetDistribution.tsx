import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import DatasetWarning from "components/DatasetWarnings/DatasetWarning";
import MetricsDataGrid from "components/DatasetWarnings/MetricsDataGrid";
import { ResponsivePlotWrapper, WarningPlot } from "components/PlotWrapper";
import React from "react";
import { DatasetWarningGroup } from "types/api";

const useStyles = makeStyles((theme) => ({
  warningGrid: {
    display: "grid",
    gridTemplateColumns: "40% 60%",
    padding: theme.spacing(2),
  },
}));

type Props = {
  isFetching: boolean;
  isSuccess: boolean;
  datasetWarningGroups?: DatasetWarningGroup[];
};

const DatasetDistribution: React.FC<Props> = ({
  isFetching,
  isSuccess,
  datasetWarningGroups,
}) => {
  const classes = useStyles();

  if (isFetching) {
    return <CircularProgress />;
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {isSuccess && datasetWarningGroups && (
        <>
          {datasetWarningGroups.map((warningGroup, index) => (
            <React.Fragment key={index}>
              <Typography variant="h5">{warningGroup.name}</Typography>
              {warningGroup.warnings.map((warning, index) => {
                return (
                  <Paper
                    key={index}
                    className={classes.warningGrid}
                    variant="outlined"
                  >
                    <DatasetWarning
                      title={warning.name}
                      description={warning.description}
                    >
                      <MetricsDataGrid
                        columns={["class_name", ...warning.columns]}
                        rows={warning.comparisons}
                        format={warning.format}
                      />
                    </DatasetWarning>
                    <WarningPlot
                      component={ResponsivePlotWrapper}
                      warning={warning}
                    />
                  </Paper>
                );
              })}
            </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};

export default DatasetDistribution;
