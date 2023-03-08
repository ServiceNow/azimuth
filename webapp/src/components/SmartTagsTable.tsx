import { ArrowForward } from "@mui/icons-material";
import {
  Box,
  BoxProps,
  FormControlLabel,
  Link,
  MenuItem,
  Select,
  Switch,
  TableSortLabel,
  TableSortLabelProps,
  Tooltip,
  Typography,
} from "@mui/material";
import noData from "assets/void.svg";
import Loading from "components/Loading";
import { motion } from "framer-motion";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  getOutcomeCountPerFilterEndpoint,
  getUtteranceCountPerFilterEndpoint,
} from "services/api";
import {
  AvailableDatasetSplits,
  CountPerFilterResponse,
  CountPerFilterValue,
  DatasetSplitName,
  Outcome,
} from "types/api";
import { QueryPipelineState } from "types/models";
import {
  ALL_OUTCOMES,
  DATASET_SMART_TAG_FAMILIES,
  OUTCOME_COLOR,
  OUTCOME_PRETTY_NAMES,
  SmartTagFamily,
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
  UNKNOWN_ERROR,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import {
  constructSearchString,
  isOutcomeCountPerFilterValue,
  isPipelineSelected,
} from "utils/helpers";
import DatasetSplitToggler from "./Controls/DatasetSplitToggler";

type MetricPerFilterOption = "label" | "prediction" | "outcome";

type SortBy = "filterValue" | "utteranceCount" | "accuracy" | SmartTagFamily;

type Row = {
  filterValue: string;
  utteranceCount: number;
  accuracy?: number;
  countPerSmartTagFamily: Partial<Record<SmartTagFamily, CountPerFilterValue>>;
} & Partial<Record<SmartTagFamily, number>>;

type Query = {
  data?: CountPerFilterResponse;
  isFetching: boolean;
  error?: { message?: string };
};

const SmartTagsTable: React.FC<{
  jobId: string;
  pipeline: QueryPipelineState;
  availableDatasetSplits: AvailableDatasetSplits | undefined;
  datasetSplitName: DatasetSplitName;
  setDatasetSplitName: (name: DatasetSplitName) => void;
}> = ({
  jobId,
  pipeline,
  availableDatasetSplits,
  datasetSplitName,
  setDatasetSplitName,
}) => {
  const [transpose, setTranspose] = React.useState(false);

  const [selectedMetricPerFilterOption, setSelectedMetricPerFilterOption] =
    React.useState<MetricPerFilterOption>("label");

  const metricPerFilterOption = isPipelineSelected(pipeline)
    ? selectedMetricPerFilterOption
    : "label";

  const [ascending, setAscending] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortBy>("utteranceCount");

  const {
    data: overall,
    isFetching,
    error,
  }: Query = isPipelineSelected(pipeline)
    ? getOutcomeCountPerFilterEndpoint.useQuery({
        jobId,
        datasetSplitName,
        ...pipeline,
      })
    : getUtteranceCountPerFilterEndpoint.useQuery({
        jobId,
        datasetSplitName,
      });

  const smartTags = (family: SmartTagFamily) =>
    overall?.countPerFilter[family]?.flatMap(({ filterValue }) =>
      filterValue === "NO_SMART_TAGS" ? [] : [filterValue]
    );

  const allData = SMART_TAG_FAMILIES.map<Query>((family, familyIndex) =>
    isPipelineSelected(pipeline)
      ? getOutcomeCountPerFilterEndpoint.useQuery(
          {
            jobId,
            datasetSplitName,
            [family]: smartTags(family),
            ...pipeline,
          },
          { skip: overall === undefined }
        )
      : getUtteranceCountPerFilterEndpoint.useQuery(
          {
            jobId,
            datasetSplitName,
            [family]: smartTags(family),
          },
          {
            skip:
              overall === undefined ||
              // React requires to call the same number of hooks in the same
              // order on every render, but we can skip the pipeline-specific queries.
              familyIndex >= DATASET_SMART_TAG_FAMILIES.length,
          }
        )
  );

  const rows = React.useMemo(() => {
    if (overall === undefined) return undefined;
    const rows = Object.fromEntries(
      overall.countPerFilter[metricPerFilterOption]!.map<[string, Row]>(
        ({ filterValue, utteranceCount, outcomeCount }) => [
          filterValue,
          {
            filterValue,
            utteranceCount,
            accuracy:
              outcomeCount &&
              ALL_OUTCOMES.filter((outcome) => outcome.startsWith("Correct"))
                .map((outcome) => outcomeCount[outcome])
                .reduce((a, b) => a + b) / utteranceCount,
            countPerSmartTagFamily: {},
          },
        ]
      )
    );
    SMART_TAG_FAMILIES.forEach((family, familyIndex) => {
      allData[familyIndex]?.data?.countPerFilter[
        metricPerFilterOption
      ]?.forEach((cell) => {
        const { filterValue, utteranceCount } = cell;
        const row = rows[filterValue];
        row[family] = utteranceCount && utteranceCount / row.utteranceCount; // Used for sorting
        row.countPerSmartTagFamily[family] = cell;
      });
    });
    return Object.values(rows);
  }, [overall, allData, metricPerFilterOption]);

  const sortedRows = React.useMemo(
    () =>
      rows?.sort(
        ({ [sortBy]: a }, { [sortBy]: b }) =>
          (ascending ? 1 : -1) *
          (typeof a === "string" && typeof b === "string"
            ? a.localeCompare(b)
            : typeof a === "number" && typeof b === "number"
            ? a - b
            : 0)
      ),
    [rows, ascending, sortBy]
  );

  if (sortedRows === undefined) {
    return isFetching ? (
      <Loading />
    ) : (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="error" />
        <Typography>{error?.message || UNKNOWN_ERROR}</Typography>
      </Box>
    );
  }

  const getSortLabelProps = (property: SortBy): TableSortLabelProps => ({
    active: sortBy === property,
    direction: sortBy === property && ascending ? "asc" : "desc",
    onClick: () => {
      setAscending(sortBy === property && !ascending);
      setSortBy(property);
    },
    ...(transpose && { IconComponent: ArrowForward }),
  });

  const Bar: React.FC<
    {
      rowCount: number;
      cellCount: number;
      barCount?: number;
      filterValue: string;
      family: SmartTagFamily;
      outcome?: Outcome;
    } & BoxProps
  > = ({
    rowCount,
    cellCount,
    barCount = cellCount,
    filterValue,
    family,
    outcome,
    ...boxProps
  }) => (
    <Tooltip
      title={
        <>
          {outcome && (
            <Typography variant="inherit">
              {barCount} utterance{barCount === 1 ? " is " : "s are "}
              <Typography variant="inherit" component="span" fontWeight="bold">
                {OUTCOME_PRETTY_NAMES[outcome]}
              </Typography>
            </Typography>
          )}
          <Typography variant="inherit">
            out of {cellCount} utterance{cellCount === 1 ? "" : "s"} tagged{" "}
            <Typography variant="inherit" component="span" fontWeight="bold">
              {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
            </Typography>
          </Typography>
          <Typography variant="inherit">
            out of {rowCount} utterance{rowCount === 1 ? "" : "s"} labeled{" "}
            <Typography variant="inherit" component="span" fontWeight="bold">
              {filterValue}
            </Typography>
          </Typography>
        </>
      }
    >
      <Box
        component={motion.div}
        height="100%"
        animate={{ width: `${rowCount && (100 * barCount) / rowCount}%` }}
        initial={false}
        transition={{ type: "tween" }}
        display="flex"
        {...boxProps}
      >
        <Link
          component={RouterLink}
          width="100%"
          to={`/${jobId}/dataset_splits/${datasetSplitName}/prediction_overview${constructSearchString(
            {
              [metricPerFilterOption]: [filterValue],
              outcome: outcome && [outcome],
              [family]: smartTags(family),
              ...pipeline,
            }
          )}`}
        />
      </Box>
    </Tooltip>
  );

  return (
    <Box display="flex" flexDirection="column" gap={4} minHeight={0}>
      <Box display="flex" gap={4}>
        <Box width={340}>
          <DatasetSplitToggler
            availableDatasetSplits={availableDatasetSplits}
            value={datasetSplitName}
            onChange={setDatasetSplitName}
          />
        </Box>
        <FormControlLabel
          control={
            <Switch
              value={transpose}
              onChange={(_, checked) => setTranspose(checked)}
            />
          }
          label="Transpose"
          labelPlacement="start"
        />
      </Box>
      <Box
        display="grid"
        gridTemplateColumns={`repeat(${transpose ? 1 : 3}, min-content)`}
        gridAutoColumns={176}
        gridAutoRows="min-content"
        overflow="auto"
        sx={{
          overscrollBehaviorX: "contain", // Stops accidental navigation on horizontal scroll with touch pad
          "& > *": { paddingX: 2 },
        }}
      >
        {sortedRows?.map((classCount, classIndex) => (
          <React.Fragment key={classCount.filterValue}>
            <Typography
              variant="subtitle2"
              align={transpose ? "center" : "right"}
              overflow="hidden"
              textOverflow="ellipsis"
              noWrap
              position="sticky"
              bgcolor={(theme) => theme.palette.background.paper}
              {...{
                [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                [`grid${transpose ? "Row" : "Column"}`]: 1,
                [transpose ? "top" : "left"]: 0,
              }}
            >
              {metricPerFilterOption === "outcome"
                ? OUTCOME_PRETTY_NAMES[classCount.filterValue as Outcome]
                : classCount.filterValue}
            </Typography>
            {classCount.accuracy !== undefined && (
              <Typography
                variant="body2"
                key={`accuracy${classCount.filterValue}`}
                align="right"
                {...{
                  [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                  [`grid${transpose ? "Row" : "Column"}`]: 2,
                }}
              >
                {formatRatioAsPercentageString(classCount.accuracy, 1)}
              </Typography>
            )}
            {transpose ? (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-end"
                gridColumn={classIndex + 2}
                gridRow={3}
              >
                <Typography variant="subtitle2" lineHeight={1} fontSize={12}>
                  0
                </Typography>
                <Typography variant="subtitle2" lineHeight={1} fontSize={12}>
                  {classCount.utteranceCount}
                </Typography>
              </Box>
            ) : (
              <Typography
                variant="body2"
                align="right"
                gridRow={classIndex + 2}
                gridColumn={3}
              >
                {classCount.utteranceCount}
              </Typography>
            )}
          </React.Fragment>
        ))}
        {isPipelineSelected(pipeline) && (
          <Typography
            variant="subtitle2"
            align="right"
            noWrap
            position="sticky"
            bgcolor={(theme) => theme.palette.background.paper}
            {...{
              [`grid${transpose ? "Column" : "Row"}`]: 1,
              [`grid${transpose ? "Row" : "Column"}`]: 2,
              [transpose ? "left" : "top"]: 0,
            }}
          >
            <TableSortLabel {...getSortLabelProps("accuracy")}>
              Accuracy
            </TableSortLabel>
          </Typography>
        )}
        <Typography
          variant="subtitle2"
          align="right"
          noWrap
          position="sticky"
          bgcolor={(theme) => theme.palette.background.paper}
          {...{
            [`grid${transpose ? "Column" : "Row"}`]: 1,
            [`grid${transpose ? "Row" : "Column"}`]: 3,
            [transpose ? "left" : "top"]: 0,
          }}
        >
          <TableSortLabel {...getSortLabelProps("utteranceCount")}>
            Total
          </TableSortLabel>
        </Typography>
        {(isPipelineSelected(pipeline)
          ? SMART_TAG_FAMILIES
          : DATASET_SMART_TAG_FAMILIES
        ).map((family, familyIndex) => (
          <React.Fragment key={familyIndex}>
            <Box
              display="flex"
              flexDirection="column"
              gap={1}
              position="sticky"
              bgcolor={(theme) => theme.palette.background.paper}
              {...{
                [`grid${transpose ? "Column" : "Row"}`]: 1,
                [`grid${transpose ? "Row" : "Column"}`]: familyIndex + 4,
                [transpose ? "left" : "top"]: 0,
              }}
              alignItems={transpose ? "end" : "center"}
            >
              <Box>
                <TableSortLabel {...getSortLabelProps(family)}>
                  <Box
                    alignItems="center"
                    display="flex"
                    flexDirection={transpose ? "row" : "row-reverse"}
                    gap={0.5}
                  >
                    <Typography
                      variant="subtitle2"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      noWrap
                    >
                      {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
                    </Typography>
                    {React.createElement(SMART_TAG_FAMILY_ICONS[family])}
                  </Box>
                </TableSortLabel>
              </Box>
              {!transpose && (
                <Box
                  width="100%"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-end"
                >
                  <Typography variant="subtitle2" lineHeight={1} fontSize={12}>
                    0%
                  </Typography>
                  <Typography variant="subtitle2" lineHeight={1} fontSize={12}>
                    100%
                  </Typography>
                </Box>
              )}
            </Box>
            {sortedRows?.map((row, classIndex) => {
              const cell = row.countPerSmartTagFamily[family];
              return (
                <Box
                  key={row.filterValue}
                  {...{
                    [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                    [`grid${transpose ? "Row" : "Column"}`]: familyIndex + 4,
                  }}
                >
                  <Box
                    height="100%"
                    display="flex"
                    borderLeft="solid 1px"
                    borderRight="solid 1px"
                    paddingY={0.5}
                  >
                    {cell &&
                      (isOutcomeCountPerFilterValue(cell) ? (
                        ALL_OUTCOMES.map((outcome) => (
                          <Bar
                            key={outcome}
                            rowCount={row.utteranceCount}
                            cellCount={cell.utteranceCount}
                            barCount={cell.outcomeCount[outcome]}
                            filterValue={row.filterValue}
                            family={family}
                            outcome={outcome}
                            bgcolor={(theme) =>
                              theme.palette[OUTCOME_COLOR[outcome]].main
                            }
                          />
                        ))
                      ) : (
                        <Bar
                          rowCount={row.utteranceCount}
                          cellCount={cell.utteranceCount}
                          filterValue={row.filterValue}
                          family={family}
                          bgcolor={(theme) => theme.palette.secondary.dark}
                        />
                      ))}
                  </Box>
                </Box>
              );
            })}
          </React.Fragment>
        ))}
        <Typography
          variant="subtitle2"
          gridRow={1}
          gridColumn={1}
          position="sticky"
          top={0}
          left={0}
          align="right"
          bgcolor={(theme) => theme.palette.background.paper}
        >
          <TableSortLabel {...getSortLabelProps("filterValue")}>
            <Select
              sx={{
                fontSize: "inherit",
                fontWeight: "bold",
                width: 100,
              }}
              // Stop click event to avoid changing order/orderBy
              onClick={(event) => event.stopPropagation()}
              variant="standard"
              id="filter-by-select"
              value={metricPerFilterOption}
              onChange={(event) =>
                setSelectedMetricPerFilterOption(
                  event.target.value as MetricPerFilterOption
                )
              }
            >
              <MenuItem key="label" value="label">
                Label
              </MenuItem>
              <MenuItem
                key="prediction"
                value="prediction"
                disabled={!isPipelineSelected(pipeline)}
              >
                Prediction
              </MenuItem>
              <MenuItem
                key="outcome"
                value="outcome"
                disabled={!isPipelineSelected(pipeline)}
              >
                Outcome
              </MenuItem>
            </Select>
          </TableSortLabel>
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(SmartTagsTable);
