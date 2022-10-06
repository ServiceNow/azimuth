import {
  alpha,
  Box,
  FormControlLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import {
  DATA_GRID_PROPS_DEFAULT_VALUES,
  GridCellParams,
  GridCellValue,
  GridColumnHeaderParams,
  GridColumnMenuContainer,
  GridColumnMenuProps,
  GridColumnsMenuItem,
  GridColumnVisibilityModel,
  GridRow,
  GridSortCellParams,
  GridSortModel,
  gridStringOrNumberComparator,
  HideGridColMenuItem,
} from "@mui/x-data-grid";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import DeltaComputationBar from "components/Metrics/DeltaComputationBar";
import OutcomeIcon from "components/Icons/OutcomeIcon";
import PipelineSelect from "components/PipelineSelect";
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
const LABEL_WIDTH = 200;
const LABEL_HEIGHT = DATA_GRID_PROPS_DEFAULT_VALUES.headerHeight;

const pipelines = ["basePipeline", "comparedPipeline"] as const;
const BASIC_FILTER_OPTIONS = ["label", "prediction"] as const;
const OPTION_PRETTY_NAME = {
  label: "Label",
  prediction: "Prediction",
  ...SMART_TAG_FAMILY_PRETTY_NAMES,
} as const;

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

  const { data: config } = getConfigEndpoint.useQuery({ jobId });

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
          ...(comparedPipeline !== undefined &&
            comparedPipelineData && {
              comparedPipeline: comparedPipelineData.metricsOverall[0],
            }),
        },
        ...basePipelineData.metricsPerFilter[selectedMetricPerFilterOption].map(
          (basePipeline, index) => ({
            id: index,
            basePipeline,
            ...(comparedPipeline !== undefined &&
              comparedPipelineData && {
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
  }, [
    basePipelineData,
    comparedPipelineData,
    comparedPipeline,
    selectedMetricPerFilterOption,
  ]);

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
      minWidth: 150,
      maxWidth: 250,
      sortComparator: customSort,
    };

    const DELTA_METRIC_COLUMN = {
      flex: 1,
      minWidth: 175,
      maxWidth: 350,
      sortComparator: customSort,
    };

    const groupHeader = (
      baseOrCompared: typeof pipelines[number],
      shortHeader: React.ReactNode,
      longHeader: React.ReactNode = shortHeader
    ) => ({
      ...(comparedPipeline === undefined
        ? {
            renderHeader: () => shortHeader,
          }
        : {
            headerClassName: "no-border-right",
            cellClassName: "no-border-right",
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
        width: LABEL_WIDTH,
        cellClassName: "sticky",
        sortComparator: customSort,
        valueGetter: ({ row }) => row.basePipeline.filterValue,
      },
      ...pipelines.map<Column<Row>>((pipeline) => ({
        ...METRIC_COLUMN,
        field: `${pipeline}UtteranceCount`,
        ...(selectedMetricPerFilterOption !== "label" &&
          groupHeader(pipeline, "Number of utterances")),
        headerName: "Total",
        align: "right",
        valueGetter: ({ row }) => row[pipeline]?.utteranceCount,
      })),
      {
        ...DELTA_METRIC_COLUMN,
        field: "deltaUtteranceCount",
        headerName: "Delta",
        cellClassName: "delta",
        headerAlign: "center",
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.utteranceCount - row.basePipeline.utteranceCount,
        renderCell: ({ value }: GridCellParams<number | undefined>) =>
          value !== undefined && (
            <DeltaComputationBar
              value={value}
              formattedValue={value}
              width={Math.abs(value)}
            />
          ),
      },
      ...ALL_OUTCOMES.flatMap<Column<Row>>((outcome) => [
        ...pipelines.map<Column<Row>>((pipeline) => ({
          ...METRIC_COLUMN,
          field: `${pipeline}${outcome}`,
          ...groupHeader(
            pipeline,
            OutcomeIcon({ outcome }),
            OUTCOME_PRETTY_NAMES[outcome]
          ),
          align: "right",
          valueGetter: ({ row }) =>
            row[pipeline] &&
            row[pipeline]!.outcomeCount[outcome] /
              row[pipeline]!.utteranceCount,
          renderCell: ({ value }: GridCellParams<number | undefined>) =>
            value !== undefined && (
              <VisualBar
                formattedValue={formatRatioAsPercentageString(value, 1)}
                value={value}
                color={(theme) =>
                  alpha(theme.palette[OUTCOME_COLOR[outcome]].main, 0.5)
                }
              />
            ),
        })),
        {
          ...DELTA_METRIC_COLUMN,
          field: `delta${outcome}`,
          headerName: "Delta",
          cellClassName: "delta",
          headerAlign: "center",
          valueGetter: ({ row }) =>
            row.comparedPipeline &&
            row.comparedPipeline.outcomeCount[outcome] /
              row.comparedPipeline.utteranceCount -
              row.basePipeline.outcomeCount[outcome] /
                row.basePipeline.utteranceCount,
          renderCell: ({ value }: GridCellParams<number | undefined>) =>
            value !== undefined && (
              <DeltaComputationBar
                value={value}
                formattedValue={formatRatioAsPercentageString(
                  value as number,
                  1
                )}
                width={isNaN(value) ? 0 : Math.abs(value) * 50}
              />
            ),
        },
      ]),
      ...metricsEntries.flatMap<Column<Row>>(
        ([metricName, { description }]) => [
          ...pipelines.map<Column<Row>>((pipeline) => ({
            ...METRIC_COLUMN,
            field: `${pipeline}${metricName}`,
            ...groupHeader(pipeline, metricName),
            description,
            align: "right",
            valueGetter: ({ row: { [pipeline]: metrics } }) =>
              metrics?.customMetrics[metricName] ?? NaN,
            renderCell: ({ value }: GridCellParams<number | undefined>) =>
              value !== undefined && (
                <VisualBar
                  formattedValue={formatRatioAsPercentageString(value, 1)}
                  value={value}
                  color={(theme) => theme.palette.primary.light}
                />
              ),
          })),
          {
            ...DELTA_METRIC_COLUMN,
            field: `delta${metricName}`,
            headerName: "Delta",
            cellClassName: "delta",
            headerAlign: "center",
            valueGetter: ({ row }) =>
              row.comparedPipeline &&
              row.comparedPipeline.customMetrics[metricName] -
                row.basePipeline.customMetrics[metricName],
            renderCell: ({ value }: GridCellParams<number | undefined>) =>
              value !== undefined && (
                <DeltaComputationBar
                  value={value}
                  formattedValue={formatRatioAsPercentageString(
                    value as number,
                    1
                  )}
                  width={isNaN(value) ? 0 : Math.abs(value) * 50}
                />
              ),
          },
        ]
      ),
      ...pipelines.map<Column<Row>>((pipeline) => ({
        ...METRIC_COLUMN,
        field: `${pipeline}ECE`,
        ...groupHeader(pipeline, "ECE"),
        align: "right",
        description: ECE_TOOLTIP,
        valueGetter: ({ row }) => row[pipeline]?.ece,
        renderCell: ({ value }: GridCellParams<number | undefined>) =>
          value !== undefined && (
            <VisualBar
              formattedValue={value.toFixed(2)}
              value={value}
              color={(theme) => alpha(theme.palette.primary.dark, 0.5)}
            />
          ),
      })),
      {
        ...DELTA_METRIC_COLUMN,
        field: `deltaECE`,
        headerName: "Delta",
        cellClassName: "delta",
        headerAlign: "center",
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.ece - row.basePipeline.ece,
        renderCell: ({ value }: GridCellParams<number | undefined>) =>
          value !== undefined && (
            <DeltaComputationBar
              value={value}
              formattedValue={value === 0 ? "0" : value.toFixed(2)}
              width={isNaN(value) ? 0 : Math.abs(value) * 50}
            />
          ),
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
    const labelColumnVisibility =
      comparedPipeline !== undefined &&
      selectedMetricPerFilterOption !== "label";
    const columnVisibilityEntries = [
      "UtteranceCount",
      ...ALL_OUTCOMES,
      ...Object.keys(metricInfo ?? {}),
      "ECE",
    ].flatMap((field) => [
      [
        `comparedPipeline${field}`,
        field === "UtteranceCount" ? labelColumnVisibility : visibility,
      ],
      [
        `delta${field}`,
        field === "UtteranceCount" ? labelColumnVisibility : visibility,
      ],
    ]);
    setColumnVisibilityModel(Object.fromEntries(columnVisibilityEntries));
  }, [pipeline, selectedMetricPerFilterOption, comparedPipeline, metricInfo]);

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

  const LabelHeader = () => (
    <Box
      className="MuiDataGrid-withBorder"
      position="relative"
      height={LABEL_HEIGHT}
      width={LABEL_WIDTH}
      marginBottom={-LABEL_HEIGHT}
      padding={(theme) => theme.spacing(1)}
      zIndex={(theme) => theme.zIndex.mobileStepper}
      bgcolor={(theme) => theme.palette.background.paper}
    >
      <Select
        sx={{
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "bold",
          color: "inherit",
        }}
        // We must stop the blur event because if not it causes exceptions elsewhere
        // See here: https://github.com/mui/mui-x/issues/1439
        // onBlur={(event) => event.stopPropagation()}
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
    </Box>
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
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 4,
        marginTop: 4,
      }}
    >
      <Box marginBottom={2} display="flex" justifyContent="space-between">
        <Box width={340}>
          <DatasetSplitToggler
            availableDatasetSplits={availableDatasetSplits}
            value={selectedDatasetSplit}
            onChange={setSelectedDatasetSplit}
          />
        </Box>
        {config && (
          <Box display="flex" flexDirection="row" alignItems="center">
            <FormControlLabel
              label={`Compare Baseline (${
                config.pipelines?.[pipeline.pipelineIndex].name
              }) with:`}
              labelPlacement="start"
              sx={{ gap: 1, paddingRight: 2 }}
              control={
                <PipelineSelect
                  selectedPipeline={comparedPipeline}
                  onChange={(value) => setComparedPipeline(value)}
                >
                  {config.pipelines?.map(
                    ({ name }, pipelineIndex) =>
                      pipelineIndex !== pipeline.pipelineIndex && (
                        <MenuItem key={pipelineIndex} value={pipelineIndex}>
                          {name}
                        </MenuItem>
                      )
                  )}
                </PipelineSelect>
              }
            ></FormControlLabel>
          </Box>
        )}
      </Box>
      <Box
        height="650px"
        display="flex"
        flexDirection="column"
        overflow="auto"
        paddingTop={1}
        border={(theme) => `1px solid ${theme.palette.grey[200]}`}
      >
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
            "& .delta": {
              background: (theme) => theme.palette.grey[100],
            },
            "& .sticky": {
              position: "sticky",
              left: 0,
              zIndex: (theme) => theme.zIndex.mobileStepper,
              background: (theme) => theme.palette.background.paper,
            },

            "& .overall": {
              background: (theme) => theme.palette.grey[200],
            },
            "& .no-border-right": {
              borderRight: "none",
            },
            "& .border-left": {
              borderLeft: (theme) => `1px solid ${theme.palette.grey[300]}`,
            },
          }}
          showCellRightBorder
          showColumnRightBorder
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          getRowClassName={({ id }) =>
            `${id === OVERALL_ROW_ID ? "overall" : ""}`
          }
          getCellClassName={({ id }) =>
            `${id === OVERALL_ROW_ID ? "overall" : ""}`
          }
          rowHeight={ROW_HEIGHT}
          columns={columns}
          rows={rows}
          loading={
            isLoading ||
            isFetchingBasePipelineData ||
            isFetchingComparedPipelineData
          }
          disableColumnMenu={false}
          sortingOrder={["desc", "asc"]}
          components={{
            ColumnMenu,
            Row: RowLink,
            Header: LabelHeader,
          }}
        />
      </Box>
    </Paper>
  );
};

export default React.memo(PerformanceAnalysisTable);
