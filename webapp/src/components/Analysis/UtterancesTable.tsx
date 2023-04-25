import {
  ArrowDropDown,
  Close,
  Fullscreen,
  GetApp,
  SvgIconComponent,
} from "@mui/icons-material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Box,
  Button,
  Dialog,
  dialogClasses,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
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
import Loading from "components/Loading";
import SmartTagFamilyBadge from "components/SmartTagFamilyBadge";
import { Column, RowProps, Table } from "components/Table";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import UtteranceSaliency from "components/Utterance/UtteranceSaliency";
import UtteranceDetails from "components/UtteranceDetails";
import React from "react";
import { Link, useHistory } from "react-router-dom";
import {
  getConfigEndpoint,
  getUtterancesEndpoint,
  updateDataActionsEndpoint,
} from "services/api";
import {
  DataAction,
  DatasetInfoResponse,
  DatasetSplitName,
  Utterance,
  UtterancePatch,
  UtterancesSortableColumn,
} from "types/api";
import {
  QueryConfusionMatrixState,
  QueryDetailsState,
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
  QueryState,
} from "types/models";
import {
  downloadDatasetSplit,
  downloadUtteranceProposedActions,
} from "utils/api";
import {
  DATASET_SMART_TAG_FAMILIES,
  ID_TOOLTIP,
  PAGE_SIZE,
  SMART_TAG_FAMILIES,
  UNKNOWN_ERROR,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { getUtteranceIdTooltip } from "utils/getUtteranceIdTooltip";
import {
  constructSearchString,
  isPipelineSelected,
  raiseErrorToast,
} from "utils/helpers";

const SMART_TAG_WIDTH = 30;

const useStyles = makeStyles((theme) => ({
  hoverableDataCell: {
    position: "relative",
  },
  idCell: {
    direction: "rtl", // To get ellipsis on the left, e.g. ...001, ...002, etc.
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
    justifyContent: "space-between",
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
  filterIcon: {
    marginLeft: theme.spacing(1),
    width: 18,
  },
}));

type Row = Utterance & { id: Utterance["persistentId"] };

type Props = {
  jobId: string;
  datasetInfo?: DatasetInfoResponse;
  datasetSplitName: DatasetSplitName;
  confusionMatrix: QueryConfusionMatrixState;
  details: QueryDetailsState;
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
  details,
  filters,
  pagination,
  pipeline,
  postprocessing,
}) => {
  const history = useHistory();
  const classes = useStyles();

  const { page = 1, sort, descending } = pagination;
  const offset = (page - 1) * PAGE_SIZE;
  const { detailsForPageItem } = details;

  const getUtterancesQueryState = {
    jobId,
    datasetSplitName,
    ...filters,
    sort,
    descending,
    limit: PAGE_SIZE,
    offset,
    ...pipeline,
    ...postprocessing,
  };

  const {
    data: utterancesResponse,
    isFetching,
    error,
  } = getUtterancesEndpoint.useQuery(getUtterancesQueryState);

  const [updateDataAction] = updateDataActionsEndpoint.useMutation();

  const rows: Row[] = React.useMemo(
    () =>
      utterancesResponse?.utterances.map((utterance) => ({
        id: utterance.persistentId,
        ...utterance,
      })) ?? [],
    [utterancesResponse]
  );

  const [selectedPersistentIds, setSelectedPersistentIds] = React.useState<
    number[]
  >([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const { data: config } = getConfigEndpoint.useQuery({ jobId });

  // If config was undefined, PipelineCheck would not even render the page.
  if (config === undefined) return null;

  const getUpdatedLocation = (update: Partial<QueryState>) =>
    `/${jobId}/dataset_splits/${datasetSplitName}/utterances${constructSearchString(
      {
        ...confusionMatrix,
        ...filters,
        ...pagination,
        ...pipeline,
        ...postprocessing,
        ...update,
      }
    )}`;

  const getToDetails = (i: number) =>
    0 <= i && i < utterancesResponse!.utteranceCount
      ? getUpdatedLocation({
          detailsForPageItem: i % PAGE_SIZE,
          page: Math.floor(i / PAGE_SIZE) + 1,
        })
      : "";

  const handlePageChange = (page: number) =>
    history.push(getUpdatedLocation({ page: page + 1 }));

  const handleSortModelChange = ([model]:
    | GridSortItem[]
    | [GridSortItem]
    | []) =>
    history.push(
      getUpdatedLocation({
        sort: model?.field as UtterancesSortableColumn | undefined,
        descending: model?.sort === "desc" || undefined,
      })
    );

  const toCloseDetails = getUpdatedLocation({ detailsForPageItem: undefined });

  const handleCloseDetails = () => history.push(toCloseDetails);

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

  const renderId = ({ value, row }: GridCellParams<number, Row>) => (
    <HoverableDataCell
      autoWidth
      title={getUtteranceIdTooltip({
        utterance: row,
        persistentIdColumn: config.columns.persistent_id,
      })}
    >
      {value}
    </HoverableDataCell>
  );

  const renderUtterance = ({ row }: GridCellParams<string, Row>) => (
    <HoverableDataCell>
      <UtteranceSaliency {...row} />
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
      persistentIds={[row.persistentId]}
      dataAction={value}
      allDataActions={datasetInfo?.dataActions || []}
      getUtterancesQueryState={getUtterancesQueryState}
    />
  );

  // The (width || minWidth) of all columns, including 50 for the checkboxes column, sum to 1272.
  // That's the width of the table when viewed on a MacBook Pro 16 with the filter panel.
  const columns: Column<Row>[] = [
    {
      field: "index",
      headerName: "Id",
      description: ID_TOOLTIP,
      width: 55,
      sortable: false,
      align: "center",
      headerAlign: "center",
      cellClassName: `${classes.hoverableDataCell} ${classes.idCell}`,
      renderCell: renderId,
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

  const importProposedActions = (file: File) => {
    const fileReader = new FileReader();
    fileReader.onload = ({ target }) => {
      if (target) {
        const result = target.result as string;
        const [header, ...rows] = result.trimEnd().split(/\r?\n/);
        if (rows.length === 0) {
          raiseErrorToast("There are no records in the CSV file.");
          return;
        }
        if (header !== `${config.columns.persistent_id},proposed_action`) {
          raiseErrorToast(
            `The CSV file must have column headers ${config.columns.persistent_id} and proposed_action, in that order.`
          );
          return;
        }

        const body = rows.map((row) => {
          const [persistentId, dataAction] = row.split(",");
          return { persistentId, dataAction } as UtterancePatch;
        });
        updateDataAction({
          ignoreNotFound: true,
          body,
          ...getUtterancesQueryState,
        });
      }
    };
    fileReader.readAsText(file);
  };

  const RowLink = (props: RowProps<Row>) => (
    <Link
      style={{ color: "unset", textDecoration: "unset" }}
      to={getUpdatedLocation({ detailsForPageItem: props.index })}
    >
      <GridRow {...props} />
    </Link>
  );

  return (
    <Box className={classes.gridContainer}>
      <div className={classes.gridHeaderActions}>
        <Description
          text="Explore utterances and propose actions. Click on a row to inspect the utterance details."
          link="user-guide/exploration-space/utterance-table/"
        />
        <Box display="flex" alignItems="center" gap={2}>
          <Button component="label" startIcon={<UploadIcon />}>
            Import
            <input
              hidden
              accept=".csv"
              type="file"
              onChange={({ target: { files } }) => {
                if (files?.length) {
                  importProposedActions(files[0]);
                }
              }}
            />
          </Button>
          <Button
            id="export-button"
            aria-controls="export-menu"
            aria-haspopup="true"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            startIcon={<GetApp />}
            endIcon={<ArrowDropDown />}
          >
            Export
          </Button>
          <Menu
            id="export-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                downloadDatasetSplit({
                  jobId,
                  datasetSplitName,
                  ...filters,
                  ...pipeline,
                });
                setAnchorEl(null);
              }}
            >
              Export utterances
            </MenuItem>
            <MenuItem
              onClick={() => {
                downloadUtteranceProposedActions({
                  jobId,
                  datasetSplitName,
                });
                setAnchorEl(null);
              }}
            >
              Export proposed actions
            </MenuItem>
          </Menu>
        </Box>
      </div>
      <Table
        pagination
        loading={isFetching}
        error={error}
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
          setSelectedPersistentIds(newSelection as number[]);
        }}
        selectionModel={selectedPersistentIds}
        components={{
          Footer: UtterancesTableFooter,
          Row: RowLink,
        }}
        componentsProps={{
          baseCheckbox: {
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          footer: {
            selectedPersistentIds,
            allDataActions: datasetInfo?.dataActions || [],
            getUtterancesQueryState,
          },
        }}
      />
      <Dialog
        open={detailsForPageItem !== undefined}
        onClose={handleCloseDetails}
        maxWidth="xl"
        fullWidth
        sx={{ [`& .${dialogClasses.paper}`]: { height: "inherit" } }} // the equivalent of fullWidth, but for height
      >
        <DialogTitle>
          Utterance Details
          <Box
            position="absolute"
            right={(theme) => theme.spacing(2)}
            top={(theme) => theme.spacing(2)}
          >
            {!isFetching &&
              utterancesResponse &&
              detailsForPageItem !== undefined &&
              detailsForPageItem in utterancesResponse.utterances && (
                <IconButton
                  size="small"
                  component={Link}
                  to={`/${jobId}/dataset_splits/${datasetSplitName}/utterances/${
                    utterancesResponse.utterances[detailsForPageItem].index
                  }${constructSearchString(pipeline)}`}
                >
                  <Fullscreen />
                </IconButton>
              )}
            <IconButton size="small" component={Link} to={toCloseDetails}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsForPageItem !== undefined &&
            (isFetching ? (
              <Loading />
            ) : utterancesResponse === undefined ? (
              <DialogContentText>
                {error?.message || UNKNOWN_ERROR}
              </DialogContentText>
            ) : !(detailsForPageItem in utterancesResponse.utterances) ? (
              <DialogContentText>Invalid URL</DialogContentText>
            ) : (
              <UtteranceDetails
                jobId={jobId}
                index={utterancesResponse.utterances[detailsForPageItem].index}
                datasetSplitName={datasetSplitName}
                getUtterancesQueryState={getUtterancesQueryState}
                utterance={utterancesResponse.utterances[detailsForPageItem]}
                confidenceThreshold={utterancesResponse.confidenceThreshold}
                arrows={{
                  toPrevious: getToDetails(offset + detailsForPageItem - 1),
                  toNext: getToDetails(offset + detailsForPageItem + 1),
                }}
              />
            ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default React.memo(UtterancesTable);
