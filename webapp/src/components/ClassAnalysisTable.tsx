import React from "react";
import { Box } from "@mui/material";
import { GridValueFormatterParams, GridCellParams } from "@mui/x-data-grid";
import { QueryPipelineState } from "types/models";
import { getClassAnalysisEndpoint } from "services/api";
import { formatRatioAsPercentageString } from "utils/format";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";
import { Table } from "./Table";
import { ClassAnalysisClassPair } from "types/api";
import { isPipelineSelected } from "utils/helpers";

const ROW_HEIGHT = 35;
const FOOTER_HEIGHT = 40;

type Row = ClassAnalysisClassPair & { id: number };
type Props = {
  jobId: string;
  pipeline: QueryPipelineState;
};
const twoDigitFormatter = ({ value }: GridValueFormatterParams) =>
  isNaN(value as number) ? "--" : (value as number).toFixed(2);

const ClassAnalysisTable: React.FC<Props> = ({ jobId, pipeline }) => {
  const { data, isFetching, error } = getClassAnalysisEndpoint.useQuery({
    jobId,
    ...pipeline,
  });

  const rows =
    data?.classPairs.map((classPairs, id) => ({
      id,
      ...classPairs,
    })) || [];

  const { numberVisible, seeMoreLessProps } = useMoreLess({
    init: INITIAL_NUMBER_VISIBLE,
    total: rows.length ?? 0,
  });

  const Footer = () => (
    <Box
      height={FOOTER_HEIGHT}
      display="flex"
      flexDirection="row"
      alignItems="end"
    >
      <SeeMoreLess {...seeMoreLessProps} />
    </Box>
  );

  return (
    <Table
      sx={{
        "& .MuiDataGrid-cell": {
          borderBottom: "none",
        },
        "& .MuiDataGrid-columnHeaders": {
          borderBottom: "none",
        },
        "& .MuiDataGrid-iconSeparator": {
          display: "none",
        },
      }}
      autoHeight
      rowHeight={ROW_HEIGHT}
      columns={[
        {
          flex: 1,
          field: "sourceClass",
          headerName: "Source Class",
        },
        {
          flex: 1,
          field: "targetClass",
          headerName: "Target Class",
        },
        {
          flex: 1,
          type: "number",
          field: "overlapScoreTrain",
          headerName: "Overlap Score",
          description: "Normalized overlap score (training set)",
          valueFormatter: twoDigitFormatter,
        },
        {
          flex: 1,
          type: "number",
          field: "pipelineConfusionEval",
          headerName: "Pipeline Confusion",
          description: "Confusion value (evaluation set)",
          valueGetter: ({ row }) =>
            (row.pipelineConfusionEval as number) /
            row.utteranceCountSourceEval,
          renderCell: ({ value, row }: GridCellParams<number, Row>) =>
            `${formatRatioAsPercentageString(value, 0)}
            (${row.pipelineConfusionEval}/${row.utteranceCountSourceEval})`,
        },
        {
          flex: 1,
          type: "number",
          field: "utteranceCountWithOverlapTrain",
          headerName: "Utterances with overlap",
          description: "Source class utterances with overlap (training set)",
          valueGetter: ({ row }) =>
            row.utteranceCountWithOverlapTrain / row.utteranceCountSourceTrain,
          renderCell: ({ value, row }: GridCellParams<number, Row>) =>
            `${formatRatioAsPercentageString(value, 0)}
            (${row.utteranceCountWithOverlapTrain}/${
              row.utteranceCountSourceTrain
            })`,
        },
      ]}
      columnVisibilityModel={
        isPipelineSelected(pipeline) ? {} : { pipelineConfusionEval: false }
      }
      rows={rows}
      sortingOrder={["desc", "asc"]}
      loading={isFetching}
      pageSize={Math.min(numberVisible, 100)} // TODO Find a better solution to DataGrid throwing an error if pageSize > 100
      error={error?.message}
      components={
        rows.length > INITIAL_NUMBER_VISIBLE
          ? {
              Footer,
            }
          : {}
      }
      initialState={{
        sorting: {
          sortModel: [{ field: "overlapScoreTrain", sort: "desc" }],
        },
      }}
    />
  );
};

export default React.memo(ClassAnalysisTable);
