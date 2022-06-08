import React from "react";
import {
  GridSortModel,
  GridValueFormatterParams,
  GridRowSpacingParams,
  GridSortCellParams,
  GridSortDirection,
  GridCellValue,
} from "@mui/x-data-grid";
import { Box, MenuItem, Select, Typography } from "@mui/material";

import { getMetricsPerFilterEndpoint } from "services/api";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";
import { ALL_OUTCOMES, OUTCOME_PRETTY_NAMES } from "utils/const";
import { DatasetSplitName, MetricsPerFilterValue } from "types/api";
import { QueryPipelineState } from "types/models";
import { formatRatioAsPercentageString } from "utils/format";
import { Table, Column } from "../Table";
import DatasetSplitToggler from "../Controls/DatasetSplitToggler";

const ROW_HEIGHT = 35;
const FOOTER_HEIGHT = 40;

const OVERALL_ROW_ID = -1; // -1 so that the other rows can range from 0 - n-1

const OPTIONS = ["label", "prediction", "smartTag"] as const;
const OPTION_PRETTY_NAME = {
  label: "Label",
  prediction: "Prediction",
  smartTag: "Smart Tag",
} as const;
type FilterByViewOption = typeof OPTIONS[number];

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
};

type Row = MetricsPerFilterValue & { id: number };

const twoDigitFormatter = ({ value }: GridValueFormatterParams) =>
  isNaN(value as number) ? "--" : (value as number).toFixed(2);
const percentageFormatter = ({ value }: GridValueFormatterParams) =>
  formatRatioAsPercentageString(value as number, 1);

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

  //Track table sort direction to keep 'overall' at top
  const sortDirectionRef = React.useRef<GridSortDirection>();
  const handleSortModelChange = (model: GridSortModel) => {
    const [sortModel] = model;
    sortDirectionRef.current = sortModel?.sort;
  };

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
    const sign = sortDirectionRef.current === "desc" ? 1 : -1;
    //Custom sort to keep 'overall' at top
    if ((param1.id as number) === OVERALL_ROW_ID) return sign;
    if ((param2.id as number) === OVERALL_ROW_ID) return -sign;

    // Fall back to default sort
    return (v1?.toLocaleString() || "").localeCompare(
      v2?.toLocaleString() || ""
    );
  };

  const NUMBER_COL_DEF = {
    width: 135,
    type: "number",
    sortComparator: customSort,
  };

  const columns: Column<Row>[] = [
    {
      width: 206,
      field: "filterValue",
      headerName: OPTION_PRETTY_NAME[selectedMetricPerFilterOption],
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
          {OPTIONS.map((key) => (
            <MenuItem key={key} value={key}>
              {OPTION_PRETTY_NAME[key]}
            </MenuItem>
          ))}
        </Select>
      ),
    },
    {
      ...NUMBER_COL_DEF,
      width: 175,
      field: "utteranceCount",
      headerName: "Nb. of Utterances",
      description: "Number of Utterances", // tooltip
    },
    ...ALL_OUTCOMES.map<Column<Row>>((outcome) => ({
      ...NUMBER_COL_DEF,
      field: outcome,
      headerName: OUTCOME_PRETTY_NAMES[outcome],
      valueGetter: ({ row }) => row.outcomeCount[outcome] / row.utteranceCount,
      valueFormatter: percentageFormatter,
    })),
    ...customMetricNames.map<Column<Row>>((metricName) => ({
      ...NUMBER_COL_DEF,
      field: metricName,
      headerName: metricName,
      valueGetter: ({ row }) => row.customMetrics[metricName],
      valueFormatter: percentageFormatter,
    })),
    {
      ...NUMBER_COL_DEF,
      field: "ece",
      headerName: "ECE",
      valueFormatter: twoDigitFormatter,
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
          "& .MuiDataGrid-iconSeparator": {
            display: "none",
          },
          "& .total": {
            background: (theme) => theme.palette.grey[200],
          },
        }}
        onSortModelChange={handleSortModelChange}
        getRowClassName={({ id }) => `${id === OVERALL_ROW_ID ? "total" : ""}`}
        getRowSpacing={getRowSpacing}
        autoHeight
        rowHeight={ROW_HEIGHT}
        columns={columns}
        rows={rows}
        loading={isFetching}
        pageSize={numberVisible}
        disableColumnMenu={false}
        components={
          rows.length > INITIAL_NUMBER_VISIBLE
            ? {
                Footer,
              }
            : {}
        }
      />
    </Box>
  );
};

export default React.memo(PerformanceAnalysis);
