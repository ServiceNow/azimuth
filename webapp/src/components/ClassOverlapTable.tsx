import React from "react";
import { Box } from "@mui/material";
import { GridCellParams, GridValueFormatterParams } from "@mui/x-data-grid";
import { QueryPipelineState } from "types/models";
import { getClassOverlapEndpoint } from "services/api";
import { formatRatioAsPercentageString } from "utils/format";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";
import { Table } from "./Table";
import { AvailableDatasetSplits, ClassOverlapTableClassPair } from "types/api";
import { isPipelineSelected } from "utils/helpers";

const ROW_HEIGHT = 35;
const FOOTER_HEIGHT = 40;

type Row = ClassOverlapTableClassPair & { id: number };
type Props = {
  jobId: string;
  pipeline: QueryPipelineState;
  availableDatasetSplits: AvailableDatasetSplits | undefined;
};
const twoDigitFormatter = ({ value }: GridValueFormatterParams) =>
  isNaN(value as number) ? "--" : (value as number).toFixed(2);

const ClassOverlapTable: React.FC<Props> = ({
  jobId,
  pipeline,
  availableDatasetSplits,
}) => {
  const { data, isFetching, error } = getClassOverlapEndpoint.useQuery({
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
          description: "The class label of the samples being analyzed.",
        },
        {
          flex: 1,
          field: "targetClass",
          headerName: "Target Class",
          description:
            "The class that the source class may look like. For pipeline confusion, this is the prediction.",
        },
        {
          flex: 1,
          type: "number",
          field: "overlapScoreTrain",
          headerName: "Semantic Overlap Score",
          description:
            "Class overlap measures the extent to which source class samples are semantically similar to target class samples, in the training data. The score comes from both the proportion of samples and their degree of similarity.",
          valueFormatter: twoDigitFormatter,
        },
        {
          flex: 1,
          type: "number",
          field: "pipelineConfusionEval",
          headerName: "Pipeline Confusion",
          description:
            "Pipeline confusion indicates whether source class samples in the evaluation set are predicted to be in the target class.",
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
          headerName: "Utterances with Overlap",
          description:
            "Percent of source class samples that semantically overlap the target class (all in the training set).",
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
        isPipelineSelected(pipeline) && availableDatasetSplits?.eval
          ? {}
          : { pipelineConfusionEval: false }
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

export default React.memo(ClassOverlapTable);
