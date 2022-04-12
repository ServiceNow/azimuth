import React from "react";
import { Box, Paper, Tooltip, Typography } from "@mui/material";
import { GridCellParams } from "@mui/x-data-grid";
import { formatRatioAsPercentageString } from "utils/format";
import {
  AvailableDatasetSplits,
  PerturbationTestSummary,
  PerturbedUtteranceExample,
} from "types/api";
import { Column, ColumnWithFieldKeyof, Table } from "components/Table";
import { DATASET_SPLIT_NAMES, DATASET_SPLIT_PRETTY_NAMES } from "utils/const";
import PerturbationTestingExporter from "components/PerturbationTestingSummary/PerturbationTestingExporter";
import { perturbationTestingColumns } from "components/Utterance/PerturbedUtterances";
import { getPerturbationTestingSummaryEndpoint } from "services/api";
import { QueryPipelineState } from "types/models";

type Row = PerturbationTestSummary & { id: number };

export const perturbationTestingFailureRateColumns = DATASET_SPLIT_NAMES.map(
  (datasetSplitName): ColumnWithFieldKeyof<Row> => ({
    field: `${datasetSplitName}FailureRate`,
    headerName: `FR on ${DATASET_SPLIT_PRETTY_NAMES[datasetSplitName]} Set`,
    description: `Failure Rate on ${DATASET_SPLIT_PRETTY_NAMES[datasetSplitName]} Set`, // tooltip
    flex: 1,
    minWidth: 194,
    renderCell: ({ value, row }: GridCellParams<number, Row>) => (
      <Tooltip
        title={`Average Confidence Delta: ${formatRatioAsPercentageString(
          row[`${datasetSplitName}ConfidenceDelta`]
        )}`}
      >
        <Typography variant="body2">
          {formatRatioAsPercentageString(value, 1)} (
          {row[`${datasetSplitName}FailedCount`]} out of{" "}
          {row[`${datasetSplitName}Count`]})
        </Typography>
      </Tooltip>
    ),
  })
);

export const perturbationTestingSummaryPreviewColumns: Column<Row>[] = [
  ...perturbationTestingColumns,
  {
    field: "description",
    headerName: "Test Description",
    flex: 1,
    minWidth: 350,
    sortable: false,
  },
];

export const perturbationTestingSummaryColumns: Column<Row>[] = [
  {
    field: "example",
    headerName: "Example",
    flex: 1,
    minWidth: 580,
    sortable: false,
    renderCell: ({ value }: GridCellParams<PerturbedUtteranceExample>) => (
      <Box>
        <Typography variant="body2">
          <Typography
            variant="body2"
            component="span"
            fontWeight={800}
            sx={{ color: (theme) => theme.palette.success.main }}
          >
            -
          </Typography>
          {value.utterance}
        </Typography>
        <Typography variant="body2">
          <Typography
            variant="body2"
            component="span"
            fontWeight={800}
            sx={{ color: (theme) => theme.palette.error.main }}
          >
            +
          </Typography>
          {value.perturbedUtterance}
        </Typography>
      </Box>
    ),
  },
];

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
  availableDatasetSplits?: AvailableDatasetSplits;
  isLoading: boolean;
};

const PerturbationTestingSummaryTable: React.FC<Props> = ({
  availableDatasetSplits,
  isLoading,
  jobId,
  pipeline,
}) => {
  const { data, isFetching } = getPerturbationTestingSummaryEndpoint.useQuery({
    jobId,
    ...pipeline,
  });

  const rows = React.useMemo(
    () => data?.allTestsSummary?.map((test, id) => ({ id, ...test })) || [],
    [data]
  );

  return (
    <Paper variant="outlined" sx={{ height: "100%", padding: 4 }}>
      <Table
        loading={isLoading || isFetching}
        rows={rows}
        columns={[
          ...perturbationTestingSummaryPreviewColumns,
          ...perturbationTestingFailureRateColumns.filter(
            (_, i) => availableDatasetSplits?.[DATASET_SPLIT_NAMES[i]]
          ),
          ...perturbationTestingSummaryColumns,
        ]}
        components={{
          Toolbar: () => (
            <Box display="flex" flexDirection="row" justifyContent="flex-end">
              <PerturbationTestingExporter jobId={jobId} pipeline={pipeline} />
            </Box>
          ),
        }}
      />
    </Paper>
  );
};

export default React.memo(PerturbationTestingSummaryTable);
