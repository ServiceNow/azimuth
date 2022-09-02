import {
  Box,
  Paper,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  GridCellParams,
  GridCellValue,
  GridColumnHeaderParams,
  GridColumnMenuContainer,
  GridColumnMenuProps,
  GridColumnsMenuItem,
  GridColumnVisibilityModel,
  GridRow,
  GridRowSpacingParams,
  GridSortCellParams,
  GridSortModel,
  gridStringOrNumberComparator,
  HideGridColMenuItem,
} from "@mui/x-data-grid";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import OutcomeIcon from "components/Icons/OutcomeIcon";
import { Table, Column, RowProps } from "components/Table";
import VisualBar from "components/VisualBar";
import React from "react";
import { Link } from "react-router-dom";
import {
  getConfigEndpoint,
  getCustomMetricInfoEndpoint,
  getMetricsPerFilterEndpoint,
} from "services/api";
import {
  AvailableDatasetSplits,
  DatasetSplitName,
  MetricsPerFilterValue,
} from "types/api";
import { QueryPipelineState } from "types/models";
import {
  ALL_OUTCOMES,
  ECE_TOOLTIP,
  OUTCOME_COLOR,
  OUTCOME_PRETTY_NAMES,
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { constructSearchString } from "utils/helpers";

const ROW_HEIGHT = 35;

const OVERALL_ROW_ID = -1; // -1 so that the other rows can range from 0 - n-1

const ColumnMenu = ({ hideMenu, currentColumn, open }: GridColumnMenuProps) => (
  <GridColumnMenuContainer
    hideMenu={hideMenu}
    currentColumn={currentColumn}
    open={open}
  >
    <HideGridColMenuItem onClick={hideMenu} column={currentColumn} />
    <GridColumnsMenuItem onClick={hideMenu} column={currentColumn} />
  </GridColumnMenuContainer>
);

const pipelines = ["basePipeline", "comparedPipeline"] as const;
const BASIC_FILTER_OPTIONS = ["label", "prediction"] as const;
const OPTION_PRETTY_NAME = {
  label: "Label",
  prediction: "Prediction",
  ...SMART_TAG_FAMILY_PRETTY_NAMES,
} as const;
type FilterByViewOption =
  | typeof BASIC_FILTER_OPTIONS[number]
  | typeof SMART_TAG_FAMILIES[number];

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
  availableDatasetSplits: AvailableDatasetSplits | undefined;
  isLoading: boolean;
};

type Row = {
  id: number;
  basePipeline: MetricsPerFilterValue;
  comparedPipeline?: MetricsPerFilterValue;
};

const PerformanceAnalysisTable: React.FC<Props> = ({
  jobId,
  pipeline,
  availableDatasetSplits,
  isLoading,
}) => {
  const [selectedDatasetSplit, setSelectedDatasetSplit] =
    React.useState<DatasetSplitName>("eval");

  const [selectedMetricPerFilterOption, setSelectedMetricPerFilterOption] =
    React.useState<FilterByViewOption>("label");

  const [comparedPipeline, setComparedPipeline] = React.useState<
    number | undefined
  >();

  const { data: config } = getConfigEndpoint.useQuery(
    { jobId },
    { skip: jobId === undefined }
  );

  const { data: metricInfo } = getCustomMetricInfoEndpoint.useQuery({
    jobId,
  });

  const {
    data: basePipelineData,
    isFetching: isFetchingBasePipelineData,
    error: errorFetchingBasePipelineData,
  } = getMetricsPerFilterEndpoint.useQuery({
    jobId,
    datasetSplitName: selectedDatasetSplit,
    ...pipeline,
  });

  const {
    data: comparedPipelineData,
    isFetching: isFetchingComparedPipelineData,
    error: errorFetchingComparedPipelineData,
  } = getMetricsPerFilterEndpoint.useQuery(
    {
      jobId,
      datasetSplitName: selectedDatasetSplit,
      pipelineIndex: comparedPipeline!,
    },
    { skip: comparedPipeline === undefined }
  );

  // Track table sort model to keep 'overall' at top.
  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: "utteranceCount", sort: "desc" },
  ]);
  // We must redefine columns when selectedMetricPerFilterOption changes.
  // The Table then loses any uncontrolled (internal) states. So, we must
  // control all states we care about, including columnVisibilityModel.
  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>({});

  const rows: Row[] = React.useMemo(() => {
    return (
      (basePipelineData && [
        {
          id: OVERALL_ROW_ID,
          basePipeline: basePipelineData.metricsOverall[0],
          ...(comparedPipelineData && {
            comparedPipeline: comparedPipelineData.metricsOverall[0],
          }),
        },
        ...basePipelineData.metricsPerFilter[selectedMetricPerFilterOption].map(
          (basePipeline, index) => ({
            id: index,
            basePipeline,
            ...(comparedPipelineData && {
              comparedPipeline:
                comparedPipelineData.metricsPerFilter[
                  selectedMetricPerFilterOption
                ][index],
            }),
          })
        ),
      ]) ||
      []
    );
  }, [basePipelineData, comparedPipelineData, selectedMetricPerFilterOption]);

  const columns: Column<Row>[] = React.useMemo(() => {
    const metricsEntries = Object.entries(metricInfo ?? {});

    const customSort = (
      // Use this sort to keep the overall row at the top always.
      // All columns must use it as their sorter.
      v1: GridCellValue,
      v2: GridCellValue,
      param1: GridSortCellParams,
      param2: GridSortCellParams
    ) => {
      const sign = sortModel[0].sort === "desc" ? 1 : -1;
      //Custom sort to keep 'overall' at top
      if ((param1.id as number) === OVERALL_ROW_ID) return sign;
      if ((param2.id as number) === OVERALL_ROW_ID) return -sign;

      // Fall back to default sort
      return gridStringOrNumberComparator(v1, v2, param1, param2);
    };

    const METRIC_COLUMN = {
      flex: 1,
      minWidth: 120,
      maxWidth: 220,
      sortComparator: customSort,
    };

    const span = (
      baseOrCompared: typeof pipelines[number],
      shortHeader: React.ReactNode,
      longHeader: React.ReactNode = shortHeader
    ) => ({
      ...(comparedPipeline === undefined
        ? { renderHeader: () => shortHeader }
        : {
            headerClassName: "span",
            cellClassName: "span",
            renderHeader:
              baseOrCompared === "basePipeline"
                ? ({ colDef }: GridColumnHeaderParams) => (
                    <>
                      {config?.pipelines?.[pipeline.pipelineIndex].name}
                      <Box
                        position="absolute"
                        left={0}
                        right={-2 * colDef.computedWidth}
                        top={0}
                        lineHeight={1}
                        textAlign="center"
                      >
                        {longHeader}
                      </Box>
                    </>
                  )
                : () => config?.pipelines?.[comparedPipeline].name,
          }),
    });

    return [
      {
        id: 1,
        field: "filterValue",
        width: 220,
        headerClassName: "sticky", // TODO doesn't work
        cellClassName: "sticky",
        sortComparator: customSort,
        valueGetter: ({ row }) => row.basePipeline.filterValue,
        renderHeader: () => (
          <Select
            sx={{
              fontFamily: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              color: "inherit",
              marginRight: 1,
            }}
            // We must stop the blur event because if not it causes exceptions elsewhere
            // See here: https://github.com/mui/mui-x/issues/1439
            onBlur={(event) => event.stopPropagation()}
            variant="standard"
            id="filter-by-select"
            value={selectedMetricPerFilterOption}
            onChange={(event) =>
              setSelectedMetricPerFilterOption(
                event.target.value as FilterByViewOption
              )
            }
          >
            {BASIC_FILTER_OPTIONS.map((key) => (
              <MenuItem key={key} value={key}>
                {OPTION_PRETTY_NAME[key]}
              </MenuItem>
            ))}
            <ListSubheader>Smart Tags</ListSubheader>
            {SMART_TAG_FAMILIES.map((key) => (
              <MenuItem key={key} value={key}>
                <Box display="flex" gap={1}>
                  {OPTION_PRETTY_NAME[key]}
                  {React.createElement(SMART_TAG_FAMILY_ICONS[key])}
                </Box>
              </MenuItem>
            ))}
          </Select>
        ),
      },
      ...pipelines.map<Column<Row>>((pipeline) => ({
        field: `${pipeline}UtteranceCount`,
        ...span(pipeline, "Total", "Utterance Count"),
        width: 120,
        align: "right",
        valueGetter: ({ row }) => row[pipeline]?.utteranceCount,
        sortComparator: customSort,
      })),
      {
        field: `deltaUtteranceCount`,
        headerName: "Delta",
        width: 120,
        align: "right",
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.utteranceCount - row.basePipeline.utteranceCount,
        sortComparator: customSort,
      },
      ...ALL_OUTCOMES.flatMap<Column<Row>>((outcome) => [
        ...pipelines.map<Column<Row>>((pipeline) => ({
          ...METRIC_COLUMN,
          field: `${pipeline}${outcome}`,
          ...span(
            pipeline,
            OutcomeIcon({ outcome }),
            OUTCOME_PRETTY_NAMES[outcome]
          ),
          valueGetter: ({ row }) =>
            row[pipeline] &&
            row[pipeline]!.outcomeCount[outcome] /
              row[pipeline]!.utteranceCount,
          renderCell: ({ value }: GridCellParams<number>) => (
            <VisualBar
              formattedValue={formatRatioAsPercentageString(value, 1)}
              value={value}
              color={(theme) => theme.palette[OUTCOME_COLOR[outcome]].main}
            />
          ),
        })),
        {
          field: `delta${outcome}`,
          headerName: "Delta",
          width: 160,
          align: "right",
          valueGetter: ({ row }) =>
            row.comparedPipeline &&
            row.comparedPipeline.outcomeCount[outcome] /
              row.comparedPipeline.utteranceCount -
              row.basePipeline.outcomeCount[outcome] /
                row.basePipeline.utteranceCount,
          renderCell: ({ value }: GridCellParams<number>) => (
            <VisualBar
              formattedValue={formatRatioAsPercentageString(value, 1)}
              value={value}
              color={(theme) => theme.palette.primary.dark}
            />
          ),
          sortComparator: customSort,
        },
      ]),
      ...metricsEntries.flatMap<Column<Row>>(
        ([metricName, { description }]) => [
          ...pipelines.map<Column<Row>>((pipeline) => ({
            ...METRIC_COLUMN,
            field: `${pipeline}${metricName}`,
            ...span(pipeline, metricName),
            description,
            valueGetter: ({ row }) => row[pipeline]?.customMetrics[metricName],
            renderCell: ({ value }: GridCellParams<number>) => (
              <VisualBar
                formattedValue={formatRatioAsPercentageString(value, 1)}
                value={value}
                color={(theme) => theme.palette.primary.light}
              />
            ),
          })),
          {
            field: `delta${metricName}`,
            headerName: "Delta",
            width: 160,
            align: "right",
            valueGetter: ({ row }) =>
              row.comparedPipeline &&
              row.comparedPipeline.customMetrics[metricName] -
                row.basePipeline.customMetrics[metricName],
            renderCell: ({ value }: GridCellParams<number>) => (
              <VisualBar
                formattedValue={formatRatioAsPercentageString(value, 1)}
                value={value}
                color={(theme) => theme.palette.primary.dark}
              />
            ),
            sortComparator: customSort,
          },
        ]
      ),
      ...pipelines.map<Column<Row>>((pipeline) => ({
        ...METRIC_COLUMN,
        field: `${pipeline}ECE`,
        ...span(pipeline, "ECE"),
        description: ECE_TOOLTIP,
        valueGetter: ({ row }) => row[pipeline]?.ece,
        renderCell: ({ value }: GridCellParams<number>) =>
          value && (
            <VisualBar
              formattedValue={value.toFixed(2)}
              value={value}
              color={(theme) => theme.palette.primary.dark}
            />
          ),
      })),
      {
        field: `deltaECE`,
        headerName: "Delta",
        width: 160,
        align: "right",
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.ece - row.basePipeline.ece,
        renderCell: ({ value }: GridCellParams<number>) =>
          value && (
            <VisualBar
              formattedValue={value.toFixed(2)}
              value={value}
              color={(theme) => theme.palette.primary.dark}
            />
          ),
        sortComparator: customSort,
      },
    ];
  }, [
    comparedPipeline,
    config,
    metricInfo,
    pipeline,
    selectedMetricPerFilterOption,
    sortModel,
  ]);

  React.useEffect(() => {
    if (comparedPipeline === pipeline.pipelineIndex) {
      setComparedPipeline(undefined);
    }
    const visibility = comparedPipeline !== undefined;
    const columnVisibilityEntries = [
      "UtteranceCount",
      ...ALL_OUTCOMES,
      ...Object.keys(metricInfo ?? {}),
      "ECE",
    ].flatMap((field) => [
      [`comparedPipeline${field}`, visibility],
      [`delta${field}`, visibility],
    ]);
    setColumnVisibilityModel(Object.fromEntries(columnVisibilityEntries));
  }, [pipeline, comparedPipeline, metricInfo]);

  const getRowSpacing = React.useCallback(({ id }: GridRowSpacingParams) => {
    return {
      bottom: id === OVERALL_ROW_ID ? 12 : 0,
    };
  }, []);

  const RowLink = (props: RowProps<Row>) => (
    <Link
      style={{ color: "unset", textDecoration: "unset" }}
      to={`/${jobId}/dataset_splits/${selectedDatasetSplit}/performance_overview${constructSearchString(
        {
          ...(props.row.id !== OVERALL_ROW_ID && {
            [selectedMetricPerFilterOption]: [
              props.row.basePipeline.filterValue,
            ],
          }),
          ...pipeline,
        }
      )}`}
    >
      <GridRow {...props} />
    </Link>
  );

  return errorFetchingBasePipelineData ? (
    <Typography
      sx={{ minHeight: 20 }}
      variant="body2"
      margin={2}
      alignSelf="center"
    >
      {errorFetchingBasePipelineData.message}
    </Typography>
  ) : errorFetchingComparedPipelineData ? (
    <Typography
      sx={{ minHeight: 20 }}
      variant="body2"
      margin={2}
      alignSelf="center"
    >
      {errorFetchingComparedPipelineData.message}
    </Typography>
  ) : (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        padding: 4,
        marginTop: 2,
      }}
    >
      <Box marginBottom={1} display="flex" justifyContent="space-between">
        <Box width={340}>
          <DatasetSplitToggler
            availableDatasetSplits={availableDatasetSplits}
            value={selectedDatasetSplit}
            onChange={setSelectedDatasetSplit}
          />
        </Box>
        <FormControl size="small">
          <InputLabel id="compare-pipeline-model">Compared with...</InputLabel>
          <Select
            id="compare-pipeline-model-select"
            value={comparedPipeline ?? "No pipeline"}
            label="Compared with..."
            displayEmpty
            onChange={({ target: { value } }) =>
              setComparedPipeline(typeof value === "number" ? value : undefined)
            }
          >
            <MenuItem value="No pipeline">
              <em>No pipeline</em>
            </MenuItem>
            {config?.pipelines?.map(
              (pipelineData, index) =>
                index !== pipeline.pipelineIndex && (
                  <MenuItem key={index} value={index}>
                    {pipelineData.name}
                  </MenuItem>
                )
            )}
          </Select>
        </FormControl>
      </Box>
      <Table
        sx={{
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-columnHeaders": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            // Stops accidental navigation on horizontal scroll with touch pad
            overscrollBehaviorX: "contain",
          },
          "& .total": {
            background: (theme) => theme.palette.grey[200],
          },
          "& .span": {
            borderRight: "none",
          },
          "& .sticky": {
            position: "sticky",
            left: 0,
            background: (theme) => theme.palette.background.paper,
          },
        }}
        showCellRightBorder
        showColumnRightBorder
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        getRowClassName={({ id }) => `${id === OVERALL_ROW_ID ? "total" : ""}`}
        getRowSpacing={getRowSpacing}
        autoHeight
        rowHeight={ROW_HEIGHT}
        columns={columns}
        rows={rows}
        loading={
          isLoading ||
          isFetchingBasePipelineData ||
          isFetchingComparedPipelineData
        }
        pageSize={rows.length}
        disableColumnMenu={false}
        sortingOrder={["desc", "asc"]}
        components={{
          ColumnMenu,
          Row: RowLink,
        }}
      />
    </Paper>
  );
};

export default React.memo(PerformanceAnalysisTable);
