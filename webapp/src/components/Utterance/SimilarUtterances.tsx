import { Warning } from "@mui/icons-material";
import { Tooltip, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { GridCellParams, GridRow } from "@mui/x-data-grid";
import HoverableDataCell from "components/Analysis/HoverableDataCell";
import CopyButton from "components/CopyButton";
import { Column, RowProps, Table } from "components/Table";
import VisualBar from "components/VisualBar";
import React from "react";
import { Link } from "react-router-dom";
import { SimilarUtterance, Utterance } from "types/api";
import { QueryPipelineState } from "types/models";
import { ID_TOOLTIP } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { getUtteranceIdTooltip } from "utils/getUtteranceIdTooltip";
import { constructSearchString, isPipelineSelected } from "utils/helpers";

const useStyles = makeStyles(() => ({
  hideRightSeparator: {
    "& > .MuiDataGrid-columnSeparator": {
      visibility: "hidden",
    },
  },
  hoverableDataCell: {
    position: "relative",
  },
  idCell: {
    direction: "rtl", // To get ellipsis on the left, e.g. ...001, ...002, etc.
  },
}));

type Row = SimilarUtterance & { id: number };

type Props = {
  baseUrl: string;
  baseUtterance: Utterance;
  persistentIdColumn: string;
  pipeline: QueryPipelineState;
  utterances: SimilarUtterance[];
};

const SimilarUtterances: React.FC<Props> = ({
  baseUrl,
  baseUtterance,
  persistentIdColumn,
  pipeline,
  utterances,
}) => {
  const classes = useStyles();

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
      cellClassName: `${classes.hoverableDataCell} ${classes.idCell}`,
      renderCell: ({ value, row }: GridCellParams<number, Row>) => (
        <HoverableDataCell
          autoWidth
          title={getUtteranceIdTooltip({
            utterance: row,
            persistentIdColumn: persistentIdColumn,
          })}
        >
          {value}
        </HoverableDataCell>
      ),
    },
    {
      field: "utterance",
      headerClassName: classes.hideRightSeparator,
      headerName: "Similar Utterance",
      flex: 1,
      sortable: false,
      cellClassName: classes.hoverableDataCell,
      renderCell: ({ value }: GridCellParams<string>) => (
        <HoverableDataCell>
          <Typography variant="inherit" whiteSpace="pre-wrap">
            {value}
          </Typography>
        </HoverableDataCell>
      ),
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
      renderCell: ({ value }: GridCellParams<number>) => (
        <VisualBar
          formattedValue={value.toFixed(2)}
          value={value}
          color={(theme) => theme.palette.primary.light}
        />
      ),
      sortable: false,
      align: "center",
      headerAlign: "center",
      width: 120,
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
                sx={(theme) => ({
                  color: theme.palette.warning.main,
                  marginRight: 1,
                })}
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
