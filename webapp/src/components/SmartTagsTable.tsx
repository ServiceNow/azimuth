import { ArrowForward } from "@mui/icons-material";
import {
  Box,
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
import { getOutcomeCountPerFilterEndpoint } from "services/api";
import {
  AvailableDatasetSplits,
  DatasetSplitName,
  OutcomeCountPerFilterValue,
} from "types/api";
import { QueryPipelineState } from "types/models";
import {
  ALL_OUTCOMES,
  OUTCOME_COLOR,
  OUTCOME_PRETTY_NAMES,
  SmartTagFamily,
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
  UNKNOWN_ERROR,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { constructSearchString } from "utils/helpers";
import DatasetSplitToggler from "./Controls/DatasetSplitToggler";

type SortBy = "filterValue" | "utteranceCount" | "accuracy" | SmartTagFamily;
type Row = {
  filterValue: string;
  utteranceCount: number;
  accuracy: number;
  outcomeCountPerSmartTagFamily: Partial<
    Record<SmartTagFamily, OutcomeCountPerFilterValue>
  >;
} & Partial<Record<SmartTagFamily, number>>;

const SmartTagsTable: React.FC<{
  jobId: string;
  pipeline: Required<QueryPipelineState>;
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
    React.useState<"label" | "prediction">("label");

  const [ascending, setAscending] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortBy>("utteranceCount");

  const {
    data: overall,
    isFetching,
    error,
  } = getOutcomeCountPerFilterEndpoint.useQuery({
    jobId,
    datasetSplitName,
    ...pipeline,
  });

  const smartTags = (family: SmartTagFamily) =>
    overall?.countPerFilter[family].flatMap(({ filterValue }) =>
      filterValue === "NO_SMART_TAGS" ? [] : [filterValue]
    );

  const allData = SMART_TAG_FAMILIES.map((family) =>
    getOutcomeCountPerFilterEndpoint.useQuery(
      {
        jobId,
        datasetSplitName,
        [family]: smartTags(family),
        ...pipeline,
      },
      { skip: overall === undefined }
    )
  );

  const rows = React.useMemo(() => {
    if (overall === undefined) return undefined;
    const rows = Object.fromEntries(
      overall.countPerFilter[selectedMetricPerFilterOption].map<[string, Row]>(
        ({ filterValue, utteranceCount, outcomeCount }) => [
          filterValue,
          {
            filterValue,
            utteranceCount,
            accuracy:
              ALL_OUTCOMES.filter((outcome) => outcome.startsWith("Correct"))
                .map((outcome) => outcomeCount[outcome])
                .reduce((a, b) => a + b) / utteranceCount,
            outcomeCountPerSmartTagFamily: {},
          },
        ]
      )
    );
    SMART_TAG_FAMILIES.forEach((family, familyIndex) => {
      allData[familyIndex].data?.countPerFilter[
        selectedMetricPerFilterOption
      ].forEach((cell) => {
        const { filterValue, utteranceCount } = cell;
        rows[filterValue][family] =
          utteranceCount && utteranceCount / rows[filterValue].utteranceCount;
        rows[filterValue].outcomeCountPerSmartTagFamily[family] = cell;
      });
    });
    return Object.values(rows);
  }, [overall, allData, selectedMetricPerFilterOption]);

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

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      gap={4}
      minHeight={0}
    >
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
        gridAutoColumns={160}
        gridAutoRows="min-content"
        overflow="auto"
        columnGap={4}
        sx={{ overscrollBehaviorX: "contain" }} // Stops accidental navigation on horizontal scroll with touch pad
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
              {classCount.filterValue}
            </Typography>
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
            {transpose ? (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-end"
                flexDirection={transpose ? undefined : "column-reverse"}
                {...{ [transpose ? "width" : "height"]: "100%" }}
                {...{
                  [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                  [`grid${transpose ? "Row" : "Column"}`]: 3,
                }}
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
                {...{
                  [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                  [`grid${transpose ? "Row" : "Column"}`]: 3,
                }}
              >
                {classCount.utteranceCount}
              </Typography>
            )}
          </React.Fragment>
        ))}
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
        {SMART_TAG_FAMILIES.map((family, familyIndex) => (
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
              const cell = row.outcomeCountPerSmartTagFamily[family];
              return (
                <Box
                  key={row.filterValue}
                  display="flex"
                  borderLeft="solid 1px"
                  borderRight="solid 1px"
                  paddingY={0.5}
                  {...{
                    [`grid${transpose ? "Column" : "Row"}`]: classIndex + 2,
                    [`grid${transpose ? "Row" : "Column"}`]: familyIndex + 4,
                  }}
                >
                  {cell &&
                    ALL_OUTCOMES.map((outcome) => (
                      <Tooltip
                        key={outcome}
                        title={
                          <>
                            <Typography variant="inherit">
                              {`${cell.outcomeCount[outcome]} utterance${
                                cell.outcomeCount[outcome] === 1 ? "" : "s"
                              } are `}
                              <Typography
                                variant="inherit"
                                component="span"
                                fontWeight="bold"
                              >
                                {OUTCOME_PRETTY_NAMES[outcome]}
                              </Typography>
                            </Typography>
                            <Typography variant="inherit">
                              {`out of ${cell.utteranceCount} utterance${
                                cell.utteranceCount === 1 ? "" : "s"
                              } tagged `}
                              <Typography
                                variant="inherit"
                                component="span"
                                fontWeight="bold"
                              >
                                {SMART_TAG_FAMILY_PRETTY_NAMES[family]}
                              </Typography>
                            </Typography>
                            <Typography variant="inherit">
                              {`out of ${row.utteranceCount} utterance${
                                row.utteranceCount === 1 ? "" : "s"
                              } labeled `}
                              <Typography
                                variant="inherit"
                                component="span"
                                fontWeight="bold"
                              >
                                {row.filterValue}
                              </Typography>
                            </Typography>
                          </>
                        }
                      >
                        <Box
                          component={motion.div}
                          bgcolor={(theme) =>
                            theme.palette[OUTCOME_COLOR[outcome]].main
                          }
                          height="100%"
                          animate={{
                            width: `${
                              row.utteranceCount &&
                              (100 * cell.outcomeCount[outcome]) /
                                row.utteranceCount
                            }%`,
                          }}
                          initial={false}
                          transition={{ type: "tween" }}
                          display="flex"
                        >
                          <Link
                            component={RouterLink}
                            width="100%"
                            to={`/${jobId}/dataset_splits/${datasetSplitName}/prediction_overview${constructSearchString(
                              {
                                [selectedMetricPerFilterOption]: [
                                  row.filterValue,
                                ],
                                outcome: [outcome],
                                [family]: smartTags(family),
                                ...pipeline,
                              }
                            )}`}
                          />
                        </Box>
                      </Tooltip>
                    ))}
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
              value={selectedMetricPerFilterOption}
              onChange={(event) =>
                setSelectedMetricPerFilterOption(
                  event.target.value as "label" | "prediction"
                )
              }
            >
              <MenuItem key="label" value="label">
                Label
              </MenuItem>
              <MenuItem key="prediction" value="prediction">
                Prediction
              </MenuItem>
            </Select>
          </TableSortLabel>
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(SmartTagsTable);
