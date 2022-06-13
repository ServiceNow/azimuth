import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import DatasetWarning from "components/DatasetWarnings/DatasetWarning";
import MetricsDataGrid from "components/DatasetWarnings/MetricsDataGrid";
import { ResponsivePlotWrapper, WarningPlot } from "components/PlotWrapper";
import React from "react";
import { DatasetWarningGroup } from "types/api";
import { Description } from "components/Description";

interface DescriptionMap {
  [key: string]: string;
}

const WARNING_GROUP_DESCRIPTION: DescriptionMap = {
  GeneralWarnings:
    "Use the metrics to assess if the evaluation dataset has the same class distribution as the training set. ",
  SyntacticWarnings:
    "Review the arrangement of utterances between your training and testing data. ",
} as const;

const WARNING_GROUP_DOC_LINK: DescriptionMap = {
  GeneralWarnings: "/dataset-warnings/#general-warnings",
  SyntacticWarnings: "/dataset-warnings/#syntactic-warnings",
} as const;

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
                <Description
                  text={
                    WARNING_GROUP_DESCRIPTION[
                      warningGroup.name.replace(/\s/g, "")
                    ]
                  }
                  link={
                    WARNING_GROUP_DOC_LINK[warningGroup.name.replace(/\s/g, "")]
                  }
                />
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
