import { GetApp, SvgIconComponent } from "@mui/icons-material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import { Box, Button } from "@mui/material";
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
import Description from "components/Description";
import OutcomeIcon from "components/Icons/OutcomeIcon";
import TargetIcon from "components/Icons/Target";
import SmartTagFamilyBadge from "components/SmartTagFamilyBadge";
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
  DATASET_SMART_TAG_FAMILIES,
  ID_TOOLTIP,
  PAGE_SIZE,
  SMART_TAG_FAMILIES,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { constructSearchString, isPipelineSelected } from "utils/helpers";

const SMART_TAG_WIDTH = 30;

const useStyles = makeStyles((theme) => ({
  hoverableDataCell: {
    position: "relative",
  },
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
  confusionMatrix: QueryConfusionMatrixState;
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: QueryPipelineState;
  postprocessing: QueryPostprocessingState;
};

const UtterancesTable: React.FC<Props> = ({
  jobId,
  datasetInfo,
  datasetSplitName,
  confusionMatrix,
  filters,
  pagination,
  pipeline,
  postprocessing,
}) => {
  const history = useHistory();
  const classes = useStyles();

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
      ...confusionMatrix,
      ...filters,
      ...pagination,
      ...pipeline,
      ...postprocessing,
      page: page + 1,
    });
    history.push(
      `/app/${jobId}/dataset_splits/${datasetSplitName}/utterances${q}`
    );
  };

  const handleSortModelChange = ([model]:
    | GridSortItem[]
    | [GridSortItem]
    | []) =>
    history.push(
      `/app/${jobId}/dataset_splits/${datasetSplitName}/utterances${constructSearchString(
        {
          ...confusionMatrix,
          ...filters,
          ...pagination,
          ...pipeline,
          ...postprocessing,
          sort: model?.field as UtterancesSortableColumn | undefined,
          descending: model?.sort === "desc" || undefined,
        }
      )}`
    );

  const smartTagFamilies = isPipelineSelected(pipeline)
    ? SMART_TAG_FAMILIES
    : DATASET_SMART_TAG_FAMILIES;

  const renderHeaderWithFilter = (
    headerName: string,
    filtered: boolean,
    Icon?: SvgIconComponent
  ) => (
    <>
      {Icon && <Icon className={classes.headerIcon} />}
      <div className="MuiDataGrid-columnHeaderTitle">{headerName}</div>
      {filtered && <FilterAltOutlinedIcon fontSize="medium" color="success" />}
    </>
  );

  const renderUtterance = ({ row }: GridCellParams<string, Row>) => (
    <HoverableDataCell>
      <UtteranceSaliency utterance={row} />
    </HoverableDataCell>
  );

  const renderHoverableDataCell = ({ value }: GridCellParams) => (
    <HoverableDataCell autoWidth>{value}</HoverableDataCell>
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

  const renderOutcome = ({ row }: GridCellParams<undefined, Row>) =>
    row.modelPrediction &&
    OutcomeIcon({ outcome: row.modelPrediction[`${prefix}Outcome`] });

  const renderSmartTags = ({ row }: GridCellParams<undefined, Row>) => (
    <Box display="grid" gridAutoColumns={SMART_TAG_WIDTH} gridAutoFlow="column">
      {smartTagFamilies.map((family) => (
        <SmartTagFamilyBadge
          key={family}
          family={family}
          smartTags={row[family]}
        />
      ))}
    </Box>
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
      width: 55,
      sortable: false,
      align: "center",
      headerAlign: "center",
      cellClassName: classes.hoverableDataCell,
      renderCell: renderHoverableDataCell,
    },
    {
      field: "utterance",
      headerClassName: classes.hideRightSeparator,
      headerName: "Utterance",
      description:
        "Utterances from dataset are overlaid with saliency maps, highlighting the most important tokens for the model's prediction.",
      flex: 5,
      minWidth: 398,
      cellClassName: classes.hoverableDataCell,
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
        renderHeaderWithFilter(
          "Label",
          filters.label !== undefined,
          TargetIcon
        ),
      flex: 1,
      minWidth: 120,
      cellClassName: classes.hoverableDataCell,
      renderCell: renderHoverableDataCell,
    },
    {
      field: "prediction",
      headerClassName: classes.hideRightSeparator,
      renderHeader: () =>
        renderHeaderWithFilter(
          "Prediction",
          filters.prediction !== undefined,
          MultilineChartIcon
        ),
      flex: 1,
      minWidth: 120,
      valueGetter: getPrediction,
      cellClassName: classes.hoverableDataCell,
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
      width: 80,
      align: "center",
      headerAlign: "center",
      valueGetter: getConfidence,
      valueFormatter: ({ value }) =>
        typeof value === "number"
          ? formatRatioAsPercentageString(value, 2)
          : undefined,
    },
    {
      field: "smartTags",
      headerName: "Smart Tags",
      renderHeader: () =>
        renderHeaderWithFilter(
          "Smart Tags",
          smartTagFamilies.some((family) => filters[family] !== undefined)
        ),
      width: 10 + SMART_TAG_WIDTH * smartTagFamilies.length,
      renderCell: renderSmartTags,
      sortable: false,
    },
    {
      field: "dataAction",
      renderHeader: () =>
        renderHeaderWithFilter(
          "Proposed Action",
          filters.dataAction !== undefined
        ),
      renderCell: renderDataAction,
      width: 155,
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
      to={`/app/${jobId}/dataset_splits/${datasetSplitName}/utterances/${props.row.id}${searchString}`}
    >
      <GridRow {...props} />
    </Link>
  );

  return (
    <Box className={classes.gridContainer}>
      <div className={classes.gridHeaderActions}>
        <Description
          text="View insights on individual utterances with details results and annotations."
          link="/exploration-space/utterances-table/"
        />
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
