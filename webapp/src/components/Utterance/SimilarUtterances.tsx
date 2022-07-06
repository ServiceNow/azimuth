import { Warning } from "@mui/icons-material";
import { Tooltip, useTheme } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { GridCellParams, GridRow } from "@mui/x-data-grid";
import CopyButton from "components/CopyButton";
import { Column, RowProps, Table } from "components/Table";
import VisualBar from "components/VisualBar";
import React from "react";
import { Link } from "react-router-dom";
import { SimilarUtterance, Utterance } from "types/api";
import { QueryPipelineState } from "types/models";
import { ID_TOOLTIP } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { constructSearchString, isPipelineSelected } from "utils/helpers";

const useStyles = makeStyles(() => ({
  hideRightSeparator: {
    "& > .MuiDataGrid-columnSeparator": {
      visibility: "hidden",
    },
  },
}));

type Row = SimilarUtterance & { id: number };

type Props = {
  baseUrl: string;
  baseUtterance: Utterance;
  pipeline: QueryPipelineState;
  utterances: SimilarUtterance[];
};

const SimilarUtterances: React.FC<Props> = ({
  baseUrl,
  baseUtterance,
  pipeline,
  utterances,
}) => {
  const classes = useStyles();
  const theme = useTheme();

  const rows: Row[] = utterances.map((utterance) => ({
    ...utterance,
    id: utterance.index,
  }));

  const columns: Column<Row>[] = [
    {
      field: "id",
      headerName: "Id",
      description: ID_TOOLTIP,
      width: 60,
      sortable: false,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "utterance",
      headerClassName: classes.hideRightSeparator,
      headerName: "Similar Utterance",
      flex: 1,
      sortable: false,
    },
    {
      field: "utteranceCopyButton",
      align: "right",
      minWidth: 40,
      width: 40,
      sortable: false,
      renderHeader: () => <></>,
      renderCell: ({ row }: GridCellParams<undefined, Row>) => (
        <CopyButton text={row.utterance} />
      ),
    },
    {
      field: "similarity",
      headerName: "Similarity",
      description:
        "Cosine similarity (1 indicates the utterance is identical while 0 indicates it is unrelated)", // tooltip
      renderCell: ({ value }: GridCellParams) => (
        <VisualBar
          formattedValue={(value as number).toFixed(2)}
          width={isNaN(value) || value < 0 ? 0 : value}
          bgColor={value > 0.5 ? "#d5d1e3" : "#0b012e"}
        />
      ),
      sortable: false,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "label",
      headerName: "Label",
      width: 180,
      sortable: false,
      renderCell: ({ value }: GridCellParams<string>) => (
        <>
          {value !== baseUtterance.label && (
            <Tooltip title="Different from base utterance">
              <Warning
                sx={{
                  color: theme.palette.warning.main,
                  marginRight: 1,
                }}
              />
            </Tooltip>
          )}
          {value}
        </>
      ),
    },
    {
      field: "postprocessedPrediction",
      headerName: "Prediction",
      width: 180,
      sortable: false,
    },
    {
      field: "postprocessedConfidence",
      headerName: "Confidence",
      width: 110,
      sortable: false,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        formatRatioAsPercentageString(params.value as number, 2),
    },
  ];

  const searchString = constructSearchString(pipeline);
  const RowLink = (props: RowProps<Row>) => (
    <Link
      style={{ color: "unset", textDecoration: "unset" }}
      to={`${baseUrl}/${props.row.id}${searchString}`}
    >
      <GridRow {...props} />
    </Link>
  );

  return (
    <Table
      rows={rows}
      columns={columns}
      columnVisibilityModel={
        isPipelineSelected(pipeline)
          ? {}
          : { postprocessedPrediction: false, postprocessedConfidence: false }
      }
      components={{ Row: RowLink }}
    />
  );
};

export default SimilarUtterances;
