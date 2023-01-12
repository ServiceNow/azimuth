import { Box, Tooltip, Typography } from "@mui/material";
import { GridCellParams } from "@mui/x-data-grid";
import HoverableDataCell, {
  hoverableDataCellClasses,
  sxTableWithHoverableDataCell,
} from "components/Analysis/HoverableDataCell";
import CheckIcon from "components/Icons/Check";
import XIcon from "components/Icons/X";
import { Column, Table } from "components/Table";
import React from "react";
import { getPerturbedUtterancesEndpoint } from "services/api";
import {
  DatasetSplitName,
  PerturbationTestSummary,
  PerturbedUtterance,
} from "types/api";
import { PREDICTION_CONFIDENCE_FAILURE_REASON } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";

type CommonPerturbationFields = {
  [T in keyof PerturbationTestSummary &
    keyof PerturbedUtterance]: PerturbedUtterance[T];
};

export const perturbationTestingColumns: Column<CommonPerturbationFields>[] = [
  {
    field: "family",
    headerName: "Test Family",
    flex: 1,
    minWidth: 120,
    sortable: false,
  },
  {
    field: "name",
    headerName: "Test Name",
    flex: 1,
    minWidth: 120,
    sortable: false,
  },
  {
    field: "perturbationType",
    headerName: "Modif. Type",
    description: "Modification Type", // tooltip
    flex: 1,
    minWidth: 120,
    sortable: false,
  },
];

type Row = PerturbedUtterance & { id: number };

export const perturbedUtterancesColumns: Column<Row>[] = [
  ...perturbationTestingColumns,
  {
    field: "perturbations[]",
    headerName: "Modifications",
    flex: 1,
    minWidth: 122,
    sortable: false,
    renderCell: ({ row }: GridCellParams<undefined, Row>) => (
      <Box>
        {row.perturbations.map((perturbations, i) => (
          <Typography variant="body2" key={i}>
            <Typography
              component="span"
              variant="inherit"
              fontWeight={800}
              color={(theme) =>
                theme.palette[
                  row.name === "Typos"
                    ? "warning"
                    : row.perturbationType === "Deletion"
                    ? "error"
                    : "success"
                ].main
              }
            >
              {row.name === "Typos"
                ? "~"
                : row.perturbationType === "Deletion"
                ? "-"
                : "+"}
            </Typography>
            {perturbations}
          </Typography>
        ))}
      </Box>
    ),
  },
  {
    field: "perturbedUtterance",
    headerName: "Modified Utterance",
    flex: 1,
    minWidth: 408,
    sortable: false,
    cellClassName: hoverableDataCellClasses.root,
    renderCell: ({ value }: GridCellParams<string>) => (
      <HoverableDataCell>
        <Typography variant="inherit" whiteSpace="pre-wrap">
          {value}
        </Typography>
      </HoverableDataCell>
    ),
  },
  {
    field: "prediction",
    headerName: "Prediction",
    flex: 1,
    minWidth: 120,
    sortable: false,
  },
  {
    field: "confidence",
    headerName: "Confidence",
    width: 108,
    sortable: false,
    renderCell: ({ value, row }: GridCellParams<number, Row>) => (
      <Tooltip
        title={`Confidence Delta: ${
          row.confidenceDelta === null
            ? "N/A"
            : formatRatioAsPercentageString(row.confidenceDelta)
        }`}
      >
        <span>{formatRatioAsPercentageString(value, 2)}</span>
      </Tooltip>
    ),
  },
  {
    field: "failed",
    headerName: "Passed",
    width: 80,
    align: "center",
    sortable: false,
    renderCell: ({ value }: GridCellParams<boolean>) => {
      const Icon = value ? XIcon : CheckIcon;
      return <Icon fontSize="large" color={value ? "error" : "success"} />;
    },
  },
  {
    field: "failureReason",
    headerName: "Failure Reason",
    flex: 1,
    minWidth: 480,
    sortable: false,
    renderCell: ({ value, row }: GridCellParams<string, Row>) =>
      row.failed && (
        <Typography variant="body2">
          {value}
          {row.failureReason === PREDICTION_CONFIDENCE_FAILURE_REASON &&
            ` (${formatRatioAsPercentageString(
              row.confidenceDelta as number,
              0
            )})`}
        </Typography>
      ),
  },
];

type Props = {
  jobId: string;
  datasetSplitName: DatasetSplitName;
  pipelineIndex: number;
  index: number;
};

const PerturbedUtterances: React.FC<Props> = (props) => {
  const { data, error, isFetching } =
    getPerturbedUtterancesEndpoint.useQuery(props);

  const rows: Row[] = React.useMemo(
    () =>
      data?.map((perturbedUtterance, index) => ({
        ...perturbedUtterance,
        id: index,
      })) ?? [],
    [data]
  );

  return (
    <Table
      columns={perturbedUtterancesColumns}
      error={error}
      loading={isFetching}
      rows={rows}
      sx={sxTableWithHoverableDataCell}
    />
  );
};

export default PerturbedUtterances;
