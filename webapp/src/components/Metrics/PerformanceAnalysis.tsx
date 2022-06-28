import {
  Box,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import {
  GridCellParams,
  GridCellValue,
  GridColumnMenuContainer,
  GridColumnMenuProps,
  GridColumnsMenuItem,
  GridRowSpacingParams,
  GridSortCellParams,
  GridSortModel,
  HideGridColMenuItem,
} from "@mui/x-data-grid";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import OutcomeIcon from "components/Icons/OutcomeIcon";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";
import { Table, Column } from "components/Table";
import { motion } from "framer-motion";
import React from "react";
import { getMetricsPerFilterEndpoint } from "services/api";
import { DatasetSplitName, MetricsPerFilterValue } from "types/api";
import { QueryPipelineState } from "types/models";
import {
  ALL_OUTCOMES,
  OUTCOME_COLOR,
  OUTCOME_PRETTY_NAMES,
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";

const ROW_HEIGHT = 35;
const FOOTER_HEIGHT = 40;

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
};

type Row = MetricsPerFilterValue & { id: number };

const PerformanceAnalysis: React.FC<Props> = ({ jobId, pipeline }) => {
  const [selectedDatasetSplit, setSelectedDatasetSplit] =
    React.useState<DatasetSplitName>("eval");
  const [selectedMetricPerFilterOption, setSelectedMetricPerFilterOption] =
    React.useState<FilterByViewOption>("label");

  const { data, isFetching, error } = getMetricsPerFilterEndpoint.useQuery({
    jobId,
    datasetSplitName: selectedDatasetSplit,
    ...pipeline,
  });

  // Track table sort model to keep 'overall' at top
  const [sortModel, setSortModel] = React.useState<GridSortModel>([
    { field: "utteranceCount", sort: "desc" },
  ]);

  const rows: Row[] = React.useMemo(() => {
    return data
      ? [
          { id: OVERALL_ROW_ID, ...data.metricsOverall[0] },
          ...data.metricsPerFilter[selectedMetricPerFilterOption]?.map(
            (metrics, index) => ({ ...metrics, id: index })
          ),
        ]
      : [];
  }, [data, selectedMetricPerFilterOption]);

  const customMetricNames = React.useMemo(() => {
    return data ? Object.keys(data.metricsOverall[0].customMetrics) : [];
  }, [data]);

  const { numberVisible, seeMoreLessProps } = useMoreLess({
    init: INITIAL_NUMBER_VISIBLE,
    total: rows.length,
  });

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
    return (v1?.toLocaleString() || "").localeCompare(
      v2?.toLocaleString() || ""
    );
  };

  const NUMBER_COL_DEF = {
    flex: 1,
    minWidth: 80,
    maxWidth: 221,
    type: "number",
    sortComparator: customSort,
  };

  const columns: Column<Row>[] = [
    {
      field: "filterValue",
      headerName: OPTION_PRETTY_NAME[selectedMetricPerFilterOption],
      width: 221,
      sortComparator: customSort,
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
            <MenuItem key={key} value={key} sx={{ gap: 1 }}>
              {OPTION_PRETTY_NAME[key]}
              {React.createElement(SMART_TAG_FAMILY_ICONS[key], {})}
            </MenuItem>
          ))}
        </Select>
      ),
    },
    {
      ...NUMBER_COL_DEF,
      field: "utteranceCount",
      headerName: "Utterance Count",
      minWidth: 150,
    },
    ...ALL_OUTCOMES.map<Column<Row>>((outcome) => ({
      ...NUMBER_COL_DEF,
      field: outcome,
      headerName: OUTCOME_PRETTY_NAMES[outcome],
      minWidth: 105,
      renderHeader: () => OutcomeIcon({ outcome }),
      renderCell: ({ row }: GridCellParams<undefined, Row>) =>
        isNaN(row.outcomeCount[outcome] / row.utteranceCount) ? (
          "--%"
        ) : (
          <Box
            display="grid"
            gridAutoColumns={50}
            gridAutoFlow="column"
            alignItems="center"
          >
            {formatRatioAsPercentageString(
              (row.outcomeCount[outcome] / row.utteranceCount) as number,
              1
            )}
            <Box
              component={motion.div}
              key={outcome}
              overflow="auto"
              height="90%"
              animate={{
                width: `${
                  (100 * row.outcomeCount[outcome]) / row.utteranceCount || 1
                }%`,
              }}
              initial={false}
              transition={{ type: "tween" }}
              bgcolor={(theme) => theme.palette[OUTCOME_COLOR[outcome]].main}
            />
          </Box>
        ),
    })),
    ...customMetricNames.map<Column<Row>>((metricName) => ({
      ...NUMBER_COL_DEF,
      field: metricName,
      headerName: metricName,
      minWidth: 105,
      renderCell: ({ row }: GridCellParams<undefined, Row>) =>
        isNaN(row.customMetrics[metricName]) ? (
          "--%"
        ) : (
          <Box display="grid" gridAutoColumns={50} gridAutoFlow="column">
            {formatRatioAsPercentageString(
              row.customMetrics[metricName] as number,
              1
            )}
            <Box
              component={motion.div}
              key={metricName}
              overflow="auto"
              height="90%"
              animate={{
                width: `${100 * row.customMetrics[metricName] || 1}%`,
              }}
              initial={false}
              transition={{ type: "tween" }}
              bgcolor="#d5d1e3"
            />
          </Box>
        ),
    })),
    {
      ...NUMBER_COL_DEF,
      field: "ece",
      headerName: "ECE",
      minWidth: 105,
      renderCell: ({ value }: GridCellParams) =>
        isNaN(value) ? (
          "--"
        ) : (
          <Box display="grid" gridAutoColumns={50} gridAutoFlow="column">
            {(value as number).toFixed(2)}
            <Box
              component={motion.div}
              key="ece"
              overflow="auto"
              height="90%"
              animate={{
                width: `${100 * value || 1}%`,
              }}
              initial={false}
              transition={{ type: "tween" }}
              bgcolor="#0b012e"
            />
          </Box>
        ),
    },
  ];

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

  const getRowSpacing = React.useCallback(({ id }: GridRowSpacingParams) => {
    return {
      bottom: id === OVERALL_ROW_ID ? 12 : 0,
    };
  }, []);

  return error ? (
    <Typography
      sx={{ minHeight: 20 }}
      variant="body2"
      margin={2}
      alignSelf="center"
    >
      {error.message}
    </Typography>
  ) : (
    <Box width={1326}>
      <Box marginBottom={1} display="flex" justifyContent="start">
        <Box width={340}>
          <DatasetSplitToggler
            value={selectedDatasetSplit}
            onChange={setSelectedDatasetSplit}
          />
        </Box>
      </Box>
      <Table
        sx={{
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-columnHeaders": {
            borderBottom: "none",
          },
          "& .total": {
            background: (theme) => theme.palette.grey[200],
          },
        }}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        getRowClassName={({ id }) => `${id === OVERALL_ROW_ID ? "total" : ""}`}
        getRowSpacing={getRowSpacing}
        autoHeight
        rowHeight={ROW_HEIGHT}
        columns={columns}
        rows={rows}
        loading={isFetching}
        pageSize={numberVisible}
        disableColumnMenu={false}
        sortingOrder={["desc", "asc"]}
        components={{
          ColumnMenu,
          ...(rows.length > INITIAL_NUMBER_VISIBLE
            ? {
                Footer,
              }
            : {}),
        }}
      />
    </Box>
  );
};

export default React.memo(PerformanceAnalysis);
