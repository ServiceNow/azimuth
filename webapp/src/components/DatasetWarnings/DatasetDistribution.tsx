import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import DatasetWarning from "components/DatasetWarnings/DatasetWarning";
import MetricsDataGrid from "components/DatasetWarnings/MetricsDataGrid";
import Description from "components/Description";
import { ResponsivePlotWrapper, WarningPlot } from "components/PlotWrapper";
import React from "react";
import { DatasetWarningGroup } from "types/api";

const DESCRIPTION = {
  "General Warnings": (
    <Description
      text="Investigate issues with class size, class imbalance, and dataset shift."
      link="user-guide/dataset-warnings/"
    />
  ),
  "Syntactic Warnings": (
    <Description
      text="Compare utterance lengths for your training and evaluation data."
      link="user-guide/dataset-warnings/"
    />
  ),
};

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
  if (isFetching) {
    return <CircularProgress />;
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {isSuccess && datasetWarningGroups && (
        <>
          {datasetWarningGroups.map((warningGroup, index) => (
            <React.Fragment key={index}>
              <Box display="flex" flexDirection="column">
                <Typography variant="h5">{warningGroup.name}</Typography>
                {DESCRIPTION[warningGroup.name as keyof typeof DESCRIPTION]}
              </Box>
              {warningGroup.warnings.map((warning, index) => {
                return (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "40% 60%",
                      padding: 2,
                    }}
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
