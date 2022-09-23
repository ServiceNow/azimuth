import {
  alpha,
  Box,
  FormControlLabel,
  ListSubheader,
  Paper,
  MenuItem,
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
  GridValueGetterParams,
  gridStringOrNumberComparator,
  HideGridColMenuItem,
} from "@mui/x-data-grid";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import DeltaComputationBars from "components/Metrics/DeltaComputationBars";
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
  Outcome,
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
import { motion } from "framer-motion";

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

const calculateDeltaMargins = (value: number) => {
  if (value <= 2) {
    return [-20, -10, 0, 10, 20];
  } else if (value > 2 && value < 5) {
    return [-50, -20, -10, 0, 10, 20, 50];
  } else if (value > 5) {
    return [-100, -50, -20, -10, 0, 10, 20, 50, 100];
  } else {
    return [-20, -10, 0, 10, 20];
  }
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
  }, [
    basePipelineData,
    comparedPipeline,
    comparedPipelineData,
    selectedMetricPerFilterOption,
  ]);

  const deltaMetrics: number[] = React.useMemo(() => {
    const delta: number[] = [];
    basePipelineData &&
      comparedPipelineData &&
      Object.keys(metricInfo ?? {}).flatMap((field) => {
        delta.push(
          comparedPipelineData.metricsOverall[0].customMetrics[field] -
            basePipelineData.metricsOverall[0].customMetrics[field]
        );
        basePipelineData.metricsPerFilter[selectedMetricPerFilterOption].map(
          (basePipeline, index) => {
            delta.push(
              comparedPipelineData.metricsPerFilter[
                selectedMetricPerFilterOption
              ][index].customMetrics[field] - basePipeline.customMetrics[field]
            );
          }
        );
      });
    const filteredDelta = delta.filter((x) => !isNaN(x));
    return calculateDeltaMargins(Math.max(...filteredDelta) * 100);
  }, [selectedMetricPerFilterOption, basePipelineData, comparedPipelineData]);

  const deltaUtteranceCount: number[] = React.useMemo(() => {
    const delta: number[] = [];
    basePipelineData &&
      comparedPipelineData &&
      delta.push(
        comparedPipelineData.metricsOverall[0].utteranceCount -
          basePipelineData.metricsOverall[0].utteranceCount
      );
    basePipelineData &&
      comparedPipelineData &&
      basePipelineData.metricsPerFilter[selectedMetricPerFilterOption].map(
        (basePipeline, index) => {
          delta.push(
            comparedPipelineData.metricsPerFilter[
              selectedMetricPerFilterOption
            ][index].utteranceCount - basePipeline.utteranceCount
          );
        }
      );
    return calculateDeltaMargins(Math.max(...delta) * 100);
  }, [selectedMetricPerFilterOption, basePipelineData, comparedPipelineData]);

  const deltaECE: number[] = React.useMemo(() => {
    const delta: number[] = [];
    basePipelineData &&
      comparedPipelineData &&
      delta.push(
        comparedPipelineData.metricsOverall[0].ece -
          basePipelineData.metricsOverall[0].ece
      );
    basePipelineData &&
      comparedPipelineData &&
      basePipelineData.metricsPerFilter[selectedMetricPerFilterOption].map(
        (basePipeline, index) => {
          delta.push(
            comparedPipelineData.metricsPerFilter[
              selectedMetricPerFilterOption
            ][index].ece - basePipeline.ece
          );
        }
      );
    const filteredDelta = delta.filter((x) => !isNaN(x));
    return calculateDeltaMargins(Math.max(...filteredDelta) * 100);
  }, [selectedMetricPerFilterOption, basePipelineData, comparedPipelineData]);

  const renderDeltaBarHeader = (margin: number[], key: string) => (
    <Box
      key={key}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {margin.map((val) => (
        <Typography margin={1} fontWeight="bold" fontSize={13}>
          {val}
        </Typography>
      ))}
    </Box>
  );

  const renderDeltaRows = ({ value }: GridCellParams) => (
    <Box
      borderLeft={(theme) =>
        `3px dashed ${alpha(theme.palette.common.black, 0.2)}`
      }
      height="100%"
      // marginRight={8.5}
      position="inherit"
    >
      <DeltaComputationBars value={value} />
    </Box>
  );

  const renderDeltaBarRows = ({ value }: GridCellParams) => (
    <Box flex={1} height="100%">
      <Box top={0} height="100%" width="100%">
        {/* left="67%" */}
        <>
          {/* <Box
            borderLeft={(theme) =>
              `3px dashed ${alpha(theme.palette.common.black, 0.2)}`
            }
            height="100%"
            width="100%"
            marginLeft={36}
          ></Box> */}
          <Box
            position="relative"
            // component={motion.div}
            key={formatRatioAsPercentageString(value, 1)}
            // overflow="auto"
            height="90%"
            sx={{
              ...(value < 0 ? { right: `50%` } : { left: "50%" }),
              width: `${Math.abs(value) * 50}%`,
            }}
            // marginLeft={1}
            // animate={{
            //   width: `${value > 0 ? 100 * value : 0}%`,
            // }}
            // initial={false}
            // transition={{ type: "tween" }}
            bgcolor={(theme) => theme.palette.primary.light}
          />
        </>
      </Box>
    </Box>
  );

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

    const groupHeader = (
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
                        right={-3 * colDef.computedWidth}
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

    const utteranceCount: Column<Row>[] =
      selectedMetricPerFilterOption === "label"
        ? [
            {
              field: "utteranceCount",
              headerName: "Total",
              description: "Number of Utterances in each model",
              width: 120,
              align: "right",
              valueGetter: ({ row }) => row.basePipeline.utteranceCount,
              sortComparator: customSort,
            },
          ]
        : [
            ...pipelines.map<Column<Row>>((pipeline) => ({
              field: `${pipeline}UtteranceCount`,
              ...groupHeader(pipeline, "Number of utterances"),
              width: 150,
              align: "right",
              valueGetter: ({ row }) => row[pipeline]?.utteranceCount,
              sortComparator: customSort,
            })),
            {
              headerName: "Delta",
              width: 100,
              align: "right",
              field: "deltaUtteranceCount",
              valueGetter: ({ row }) =>
                row.comparedPipeline &&
                row.comparedPipeline.utteranceCount -
                  row.basePipeline.utteranceCount,
              sortComparator: customSort,
            },
          ];

    const styleDeltaValues = (value: number) =>
      value >= 0 ? "delta-value-positive" : "delta-value-negative";

    return [
      {
        id: 1,
        field: "filterValue",
        disableColumnMenu: true,
        width: 200,
        hideSortIcons: true,
        headerHeight: 15,
        headerAlign: "right",
        headerClassName: "sticy",
        cellClassName: "sticky",
        sortComparator: customSort,
        valueGetter: ({ row }) => row.basePipeline.filterValue,
        renderHeader: () => <Box height={15}></Box>,
      },
      ...utteranceCount,
      ...ALL_OUTCOMES.flatMap<Column<Row>>((outcome) => [
        ...pipelines.map<Column<Row>>((pipeline) => ({
          ...METRIC_COLUMN,
          field: `${pipeline}${outcome}`,
          align: "right",
          ...groupHeader(
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
              color={(theme) =>
                alpha(theme.palette[OUTCOME_COLOR[outcome]].main, 0.5)
              }
            />
          ),
        })),
        {
          headerName: "Delta",
          width: 100,
          align: "right",
          headerAlign: "right",
          headerClassName: "span",
          field: `delta${outcome}`,
          valueGetter: ({ row }) =>
            row.comparedPipeline &&
            row.comparedPipeline.outcomeCount[outcome] /
              row.comparedPipeline.utteranceCount -
              row.basePipeline.outcomeCount[outcome] /
                row.basePipeline.utteranceCount,
          cellClassName: ({ value }: GridCellParams<number>) =>
            styleDeltaValues(value),
          valueFormatter: ({ value }) =>
            formatRatioAsPercentageString(value as number, 1),
          sortComparator: customSort,
        },
        {
          field: `delta${outcome}Bars`,
          width: 200,
          align: "right",
          headerAlign: "right",
          headerName: "Delta Bars",
          valueGetter: ({ row }) =>
            row.comparedPipeline &&
            row.comparedPipeline.outcomeCount[outcome] /
              row.comparedPipeline.utteranceCount -
              row.basePipeline.outcomeCount[outcome] /
                row.basePipeline.utteranceCount,
          renderCell: ({ value }: GridCellParams<number>) => <></>,
          sortComparator: customSort,
        },
      ]),
      ...metricsEntries.flatMap<Column<Row>>(
        ([metricName, { description }]) => [
          ...pipelines.map<Column<Row>>((pipeline) => ({
            ...METRIC_COLUMN,
            field: `${pipeline}${metricName}`,
            align: "right",
            ...groupHeader(pipeline, metricName),
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
            headerName: "Delta",
            width: 100,
            align: "right",
            headerAlign: "right",
            headerClassName: "span",
            field: `delta${metricName}`,
            valueGetter: ({ row }) =>
              row.comparedPipeline &&
              row.comparedPipeline.customMetrics[metricName] -
                row.basePipeline.customMetrics[metricName],
            cellClassName: ({ value }: GridCellParams<number>) =>
              styleDeltaValues(value),
            valueFormatter: ({ value }) =>
              formatRatioAsPercentageString(value as number, 1),
            sortComparator: customSort,
          },
          {
            field: `delta${metricName}Bars`,
            width: 200,
            align: "right",
            headerAlign: "right",
            renderHeader: () =>
              renderDeltaBarHeader(deltaMetrics, `delta${metricName}Bars`),
            valueGetter: ({ row }) =>
              row.comparedPipeline &&
              row.comparedPipeline.customMetrics[metricName] -
                row.basePipeline.customMetrics[metricName],
            renderCell: renderDeltaBarRows,
            sortComparator: customSort,
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
        field: `deltaECE`,
        headerName: "Delta",
        align: "right",
        headerAlign: "right",
        headerClassName: "span",
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.ece - row.basePipeline.ece,
        cellClassName: ({ value }: GridCellParams<number>) =>
          styleDeltaValues(value),
        valueFormatter: ({ value }) => value && (value as number).toFixed(2),
        sortComparator: customSort,
      },
      {
        field: `deltaECEBars`,
        width: 450,
        align: "right",
        headerAlign: "right",
        renderHeader: () => renderDeltaBarHeader(deltaECE, "deltaECEBar"),
        valueGetter: ({ row }) =>
          row.comparedPipeline &&
          row.comparedPipeline.ece - row.basePipeline.ece,
        renderCell: renderDeltaBarRows,
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
      [`delta${field}Bars`, visibility],
    ]);
    setColumnVisibilityModel(Object.fromEntries(columnVisibilityEntries));
  }, [pipeline, comparedPipeline, metricInfo]);

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

  const ClassHeader = () => (
    <Select
      sx={{
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "bold",
        color: "inherit",
        marginLeft: 1,
        top: (theme) => theme.spacing(2),
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
        {config && (
          <FormControlLabel
            label={`Compare Baseline (${
              config?.pipelines?.[pipeline.pipelineIndex].name
            } ) with:`}
            labelPlacement="start"
            sx={{ gap: 1, paddingRight: 2 }}
            control={
              <Select
                id="compare-pipeline-model-select"
                variant="standard"
                value={comparedPipeline ?? "No pipeline"}
                displayEmpty
                onChange={({ target: { value } }) =>
                  setComparedPipeline(
                    typeof value === "number" ? value : undefined
                  )
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
            }
          ></FormControlLabel>
        )}
      </Box>
      <Box
        sx={{
          marginTop: 2,
          border: (theme) => `1px solid ${theme.palette.grey[200]}`,
          paddingTop: (theme) => theme.spacing(3),
        }}
      >
        <Table
          sx={{
            "& .MuiDataGrid-cell": {
              borderBottom: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: "none",
              height: DATA_GRID_PROPS_DEFAULT_VALUES.headerHeight,
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
              borderRight: "1px solid grey",
              background: (theme) => theme.palette.background.paper,
            },
            "& .delta-value-positive": {
              color: (theme) => theme.palette.secondary.dark,
              fontWeight: "bold",
              borderRight: "none",
            },
            "& .delta-value-negative": {
              color: (theme) => theme.palette.primary.main,
              fontWeight: "bold",
              borderRight: "none",
            },
          }}
          showCellRightBorder
          showColumnRightBorder
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          getRowClassName={({ id }) =>
            `${id === OVERALL_ROW_ID ? "total" : ""}`
          }
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
            Header: ClassHeader,
          }}
        />
      </Box>
    </Paper>
  );
};

export default React.memo(PerformanceAnalysisTable);
