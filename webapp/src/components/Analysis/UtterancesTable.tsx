import { GetApp, SvgIconComponent } from "@mui/icons-material";
import AdjustIcon from "@mui/icons-material/Adjust";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import { Box, Button, Chip, Tooltip, useTheme } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import {
  GridCellParams,
  GridRow,
  GridSortItem,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import HoverableDataCell from "components/Analysis/HoverableDataCell";
import UtterancesTableFooter from "components/Analysis/UtterancesTableFooter";
import CopyButton from "components/CopyButton";
import CheckIcon from "components/Icons/Check";
import XIcon from "components/Icons/X";
import { Column, RowProps, Table } from "components/Table";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import UtteranceSaliency from "components/Utterance/UtteranceSaliency";
import React from "react";
import { Link, useHistory } from "react-router-dom";
import { getUtterancesEndpoint } from "services/api";
import {
  DataAction,
  DatasetInfoResponse,
  DatasetSplitName,
  Outcome,
  Utterance,
  UtterancesSortableColumn,
} from "types/api";
import {
  QueryFilterState,
  QueryConfusionMatrixState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
} from "types/models";
import { downloadDatasetSplit } from "utils/api";
import {
  ID_TOOLTIP,
  OUTCOME_COLOR,
  OUTCOME_PRETTY_NAMES,
  PAGE_SIZE,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { constructSearchString, isPipelineSelected } from "utils/helpers";

const useStyles = makeStyles((theme) => ({
  gridContainer: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  hideRightSeparator: {
    "& > .MuiDataGrid-columnSeparator": {
      visibility: "hidden",
    },
  },
  gridHeaderActions: {
    display: "flex",
    flexDirection: "row",
  },
  searchContainer: {
    marginLeft: theme.spacing(2),
    alignItems: "center",
    display: "grid",
    width: 340,
    columnGap: theme.spacing(1),
    gridTemplateColumns: "auto 1fr",
  },
  headerIcon: {
    marginRight: theme.spacing(1),
  },
  chip: {
    cursor: "unset",
    fontSize: "11px",
  },
  wordWrap: {
    lineHeight: "normal",
    whiteSpace: "normal",
  },
  exportButton: {
    marginLeft: "auto",
  },
  filterIcon: {
    marginLeft: theme.spacing(1),
    width: 18,
  },
}));

type Row = Utterance & { id: number };

type Props = {
  jobId: string;
  datasetInfo?: DatasetInfoResponse;
  datasetSplitName: DatasetSplitName;
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: QueryPipelineState;
  postprocessing: QueryPostprocessingState;
  confusionMatrixState: QueryConfusionMatrixState;
};

const UtterancesTable: React.FC<Props> = ({
  jobId,
  datasetInfo,
  datasetSplitName,
  filters,
  pagination,
  pipeline,
  postprocessing,
  confusionMatrixState,
}) => {
  const history = useHistory();
  const classes = useStyles();
  const theme = useTheme();

  const { page = 1, sort, descending } = pagination;

  const getUtterancesQueryState = {
    jobId,
    datasetSplitName,
    ...filters,
    sort,
    descending,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...pipeline,
    ...postprocessing,
  };

  const { data: utterancesResponse, isFetching } =
    getUtterancesEndpoint.useQuery(getUtterancesQueryState);

  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  const handlePageChange = (page: number) => {
    const q = constructSearchString({
      ...filters,
      ...pagination,
      ...pipeline,
      ...postprocessing,
      ...confusionMatrixState,
      page: page + 1,
    });
    history.push(`/${jobId}/dataset_splits/${datasetSplitName}/utterances${q}`);
  };

  const handleSortModelChange = ([model]:
    | GridSortItem[]
    | [GridSortItem]
    | []) =>
    history.push(
      `/${jobId}/dataset_splits/${datasetSplitName}/utterances${constructSearchString(
        {
          ...filters,
          ...pagination,
          ...pipeline,
          ...postprocessing,
          ...confusionMatrixState,
          sort: model?.field as UtterancesSortableColumn | undefined,
          descending: model?.sort === "desc" || undefined,
        }
      )}`
    );

  const renderHeaderWithFilter = (
    headerName: string,
    filter?: string[],
    Icon?: SvgIconComponent
  ) => (
    <>
      {Icon && <Icon className={classes.headerIcon} />}
      <div className="MuiDataGrid-columnHeaderTitle">{headerName}</div>
      {filter !== undefined && (
        <FilterAltOutlinedIcon fontSize="medium" color="success" />
      )}
    </>
  );

  const renderUtterance = ({ row }: GridCellParams<string, Row>) => (
    <HoverableDataCell>
      <UtteranceSaliency utterance={row} />
    </HoverableDataCell>
  );

  const renderHoverableDataCell = ({ value }: GridCellParams) => (
    <HoverableDataCell>{value}</HoverableDataCell>
  );

  const getPrediction = ({ row }: GridValueGetterParams<undefined, Row>) => {
    const prediction = row.modelPrediction?.modelPredictions[0];
    if (postprocessing.withoutPostprocessing) {
      return prediction;
    }
    const postprocessedPrediction =
      row.modelPrediction?.postprocessedPrediction;
    return postprocessedPrediction !== prediction
      ? `${postprocessedPrediction} (${prediction})`
      : prediction;
  };

  const prefix = postprocessing.withoutPostprocessing
    ? "model"
    : "postprocessed";

  const getConfidence = ({ row }: GridValueGetterParams<undefined, Row>) =>
    row.modelPrediction?.[`${prefix}Confidences`][0];

  const outcomeIcon = (outcome: Outcome) => {
    const Icon = outcome.includes("Correct") ? CheckIcon : XIcon;
    const color = theme.palette[OUTCOME_COLOR[outcome]].main;
    return (
      <Tooltip title={OUTCOME_PRETTY_NAMES[outcome]}>
        <Icon fontSize="large" sx={{ color }} />
      </Tooltip>
    );
  };

  const renderOutcome = ({ row }: GridCellParams<undefined, Row>) =>
    row.modelPrediction && outcomeIcon(row.modelPrediction[`${prefix}Outcome`]);

  const renderSmartTags = ({ row }: GridCellParams<undefined, Row>) => (
    <HoverableDataCell>
      {row.smartTags.map((tag) => (
        <Chip
          className={classes.chip}
          color="primary"
          variant="outlined"
          size="small"
          key={tag}
          label={tag}
        />
      ))}
    </HoverableDataCell>
  );

  const renderDataAction = ({
    value,
    row,
  }: GridCellParams<DataAction, Row>) => (
    <UtteranceDataAction
      utteranceIds={[row.id]}
      dataAction={value}
      allDataActions={datasetInfo?.dataActions || []}
      getUtterancesQueryState={getUtterancesQueryState}
    />
  );

  // The (width || minWidth) of all columns, including 50 for the checkboxes column, sum to 1272.
  // That's the width of the table when viewed on a MacBook Pro 16 with the filter panel.
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
      headerName: "Utterance",
      flex: 5,
      minWidth: 406,
      renderCell: renderUtterance,
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
      field: "label",
      renderHeader: () =>
        renderHeaderWithFilter("Label", filters.labels, AdjustIcon),
      flex: 1,
      minWidth: 120,
      renderCell: renderHoverableDataCell,
    },
    {
      field: "prediction",
      headerClassName: classes.hideRightSeparator,
      renderHeader: () =>
        renderHeaderWithFilter(
          "Prediction",
          filters.predictions,
          MultilineChartIcon
        ),
      flex: 1,
      minWidth: 120,
      valueGetter: getPrediction,
      renderCell: renderHoverableDataCell,
    },
    {
      field: "outcome",
      align: "right",
      minWidth: 34,
      width: 34,
      sortable: false,
      renderHeader: () => <></>,
      renderCell: renderOutcome,
    },
    {
      field: "confidence",
      headerName: "Conf",
      description: "Confidence", // tooltip
      width: 90,
      align: "center",
      headerAlign: "center",
      valueGetter: getConfidence,
      valueFormatter: ({ value }) =>
        typeof value === "number"
          ? formatRatioAsPercentageString(value, 2)
          : undefined,
    },
    {
      field: "smartTags[]",
      renderHeader: () =>
        renderHeaderWithFilter("Smart Tags", filters.smartTags),
      flex: 5,
      minWidth: 160,
      renderCell: renderSmartTags,
      sortable: false,
    },
    {
      field: "dataAction",
      renderHeader: () =>
        renderHeaderWithFilter("Proposed Action", filters.dataActions),
      renderCell: renderDataAction,
      width: 192,
    },
  ];

  const rows: Row[] = React.useMemo(
    () =>
      utterancesResponse?.utterances.map((utterance) => ({
        id: utterance.index,
        ...utterance,
      })) ?? [],
    [utterancesResponse]
  );

  const searchString = constructSearchString(pipeline);
  const RowLink = (props: RowProps<Row>) => (
    <Link
      style={{ color: "unset", textDecoration: "unset" }}
      to={`/${jobId}/dataset_splits/${datasetSplitName}/utterances/${props.row.id}${searchString}`}
    >
      <GridRow {...props} />
    </Link>
  );

  return (
    <Box className={classes.gridContainer}>
      <div className={classes.gridHeaderActions}>
        <Button
          className={classes.exportButton}
          onClick={() =>
            downloadDatasetSplit({
              jobId,
              datasetSplitName,
              ...filters,
              ...pipeline,
            })
          }
          startIcon={<GetApp />}
        >
          Export
        </Button>
      </div>
      <Table
        pagination
        loading={isFetching}
        rows={rows}
        columns={columns}
        columnVisibilityModel={
          isPipelineSelected(pipeline)
            ? {}
            : { prediction: false, outcome: false, confidence: false }
        }
        paginationMode="server"
        page={page - 1}
        rowCount={utterancesResponse?.utteranceCount ?? 0}
        onPageChange={handlePageChange}
        sortingMode="server"
        sortModel={
          sort ? [{ field: sort, sort: descending ? "desc" : "asc" }] : []
        }
        onSortModelChange={handleSortModelChange}
        checkboxSelection
        disableColumnMenu
        onSelectionModelChange={(newSelection) => {
          setSelectedIds(newSelection as number[]);
        }}
        selectionModel={selectedIds}
        components={{
          Footer: UtterancesTableFooter,
          Row: RowLink,
        }}
        componentsProps={{
          baseCheckbox: {
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          footer: {
            selectedIds,
            allDataActions: datasetInfo?.dataActions || [],
            getUtterancesQueryState,
          },
        }}
      />
    </Box>
  );
};

export default React.memo(UtterancesTable);
