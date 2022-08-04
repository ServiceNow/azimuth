import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  FormControlLabelProps,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
  QueryConfusionMatrixState,
  QueryArrayFiltersState,
} from "types/models";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { motion } from "framer-motion";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import { CountPerFilterResponse, DatasetSplitName } from "types/api";
import { useHistory, useParams } from "react-router-dom";
import { constructSearchString, isPipelineSelected } from "utils/helpers";
import {
  FILTER_CONTAINER_CLOSED_WIDTH,
  FILTER_CONTAINER_OPENED_WIDTH,
} from "styles/const";
import {
  getDatasetInfoEndpoint,
  getOutcomeCountPerFilterEndpoint,
  getUtteranceCountPerFilterEndpoint,
} from "services/api";
import DatasetSplitToggler from "./DatasetSplitToggler";
import FilterSelector from "./FilterSelector";
import FilterSlider from "./FilterSlider";
import FilterTextField from "./FilterTextField";
import {
  OUTCOME_PRETTY_NAMES,
  SMART_TAG_FAMILIES,
  SMART_TAG_FAMILY_ICONS,
  SMART_TAG_FAMILY_PRETTY_NAMES,
} from "utils/const";
import Description from "components/Description";

const MotionChevronLeftIcon = motion(ChevronLeftIcon);

type Props = {
  confusionMatrix: QueryConfusionMatrixState;
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: QueryPipelineState;
  postprocessing: QueryPostprocessingState;
  searchString: string;
};

type Query = {
  data?: CountPerFilterResponse;
  isFetching: boolean;
};

const Controls: React.FC<Props> = ({
  confusionMatrix,
  filters,
  pagination,
  pipeline,
  postprocessing,
  searchString,
}) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const history = useHistory();
  const { jobId, datasetSplitName, mainView } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
    mainView?: string;
  }>();
  const baseUrl = `/${jobId}/dataset_splits/${datasetSplitName}/${mainView}`;

  const { data: countPerFilter, isFetching: isFetchingCountPerFilter }: Query =
    isPipelineSelected(pipeline)
      ? getOutcomeCountPerFilterEndpoint.useQuery({
          jobId,
          datasetSplitName,
          ...filters,
          ...pipeline,
          ...postprocessing,
        })
      : getUtteranceCountPerFilterEndpoint.useQuery({
          jobId,
          datasetSplitName,
          ...filters,
        });

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const totalUtterances = datasetInfo?.[
    `${datasetSplitName}ClassDistribution`
  ].reduce((a, b) => a + b);

  const handleCollapseFilters = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleClearSearch = () => {
    setSearchValue("");
  };

  const handleClearFilters = () => {
    history.push(
      `${baseUrl}${constructSearchString({
        ...confusionMatrix,
        ...pagination,
        ...pipeline,
        ...postprocessing,
      })}`
    );
  };

  const handleFilterChange = (filters: QueryFilterState) =>
    history.push(
      `${baseUrl}${constructSearchString({
        ...confusionMatrix,
        ...filters,
        ...pagination,
        ...pipeline,
        ...postprocessing,
      })}`
    );

  const getFilterChangeHandler =
    <FilterName extends keyof QueryFilterState>(filterName: FilterName) =>
    (filterValue: QueryFilterState[FilterName]) =>
      handleFilterChange({ ...filters, [filterName]: filterValue });

  const handleConfidenceChange = ([min, max]: [number, number]) =>
    handleFilterChange({
      ...filters,
      confidenceMin: min > 0 ? min : undefined,
      confidenceMax: max < 1 ? max : undefined,
    });

  const handleDatasetSplitChange = (name: DatasetSplitName) =>
    history.push(`/${jobId}/dataset_splits/${name}/${mainView}${searchString}`);

  const handlePostprocessingChange = (checked: boolean) =>
    history.push(
      `${baseUrl}${constructSearchString({
        ...confusionMatrix,
        ...filters,
        ...pagination,
        ...pipeline,
        withoutPostprocessing: checked || undefined,
      })}`
    );

  const transition = { type: "tween" };

  const maxCount = useMemo(() => {
    return countPerFilter
      ? Math.max(
          ...Object.values(countPerFilter.countPerFilter).flatMap(
            (c) => c?.map(({ utteranceCount }) => utteranceCount) ?? []
          )
        )
      : 0;
  }, [countPerFilter]);

  const getFilterSelectorProps = (filter: keyof QueryArrayFiltersState) => ({
    maxCount: maxCount,
    searchValue: searchValue,
    selectedOptions: filters[filter] ?? [],
    handleValueChange: getFilterChangeHandler(filter),
    filters: countPerFilter?.countPerFilter[filter],
    isFetching: isFetchingCountPerFilter,
  });

  const divider = (
    <Box marginY={1} borderBottom="1px solid rgba(0, 0, 0, 0.12)" />
  );

  return (
    <Stack
      component={motion.div}
      border="1px solid rgba(0, 0, 0, 0.12)"
      boxSizing="content-box"
      overflow="hidden"
      sx={{
        borderTopRightRadius: theme.shape.borderRadius,
        borderBottomRightRadius: theme.shape.borderRadius,
        backgroundColor: "white",
      }}
      animate={{
        width: isCollapsed
          ? FILTER_CONTAINER_CLOSED_WIDTH
          : FILTER_CONTAINER_OPENED_WIDTH,
      }}
      initial={false}
      transition={transition}
    >
      <Box display="flex" position="relative" padding={1}>
        {!isCollapsed && (
          <Box display="flex" alignItems="center" gap={1} whiteSpace="nowrap">
            <TuneIcon />
            <Typography variant="subtitle2">Controls</Typography>
            <Description link="/exploration-space/#control-panel" />
          </Box>
        )}
        <Button
          variant="outlined"
          sx={{ minWidth: 0, padding: 0, position: "absolute" }}
          onClick={handleCollapseFilters}
          component={motion.button}
          animate={{
            // We can only reliably animate with an absolute value from `left`
            // since the `container` motion.div becomes narrower than its
            // content during the animation
            left: isCollapsed
              ? FILTER_CONTAINER_CLOSED_WIDTH / 2
              : FILTER_CONTAINER_OPENED_WIDTH,
            transform: `translateX(-${isCollapsed ? 50 : 100}%)`,
          }}
          initial={false}
          transition={transition}
        >
          <MotionChevronLeftIcon
            animate={{ rotate: isCollapsed ? -180 : 0 }}
            transition={transition}
          />
        </Button>
      </Box>
      {!isCollapsed && (
        <>
          <Box margin={1}>
            <DatasetSplitToggler
              value={datasetSplitName}
              onChange={handleDatasetSplitChange}
            />
          </Box>
          <Box margin={1}>
            <Tooltip title="Exclude post-processing in predictions and any derived output. This only affects the Exploration Space, and won't affect the smart tags.">
              <FormControlLabel
                control={
                  <Switch
                    checked={postprocessing.withoutPostprocessing ?? false}
                    color="secondary"
                    onChange={(_, checked) =>
                      handlePostprocessingChange(checked)
                    }
                  />
                }
                label="Exclude post-processing"
              />
            </Tooltip>
          </Box>
          <Box display="flex" justifyContent="space-between" marginX={1}>
            <Box display="flex" alignItems="center" gap={1} whiteSpace="nowrap">
              <Typography variant="subtitle2">Filters</Typography>
              {isFetchingCountPerFilter ? (
                <CircularProgress size={16} />
              ) : (
                <Typography variant="body2">
                  ({countPerFilter?.utteranceCount}
                  {totalUtterances && `/${totalUtterances}`} utterances)
                </Typography>
              )}
            </Box>
            <Button onClick={handleClearFilters}>Clear filters</Button>
          </Box>
          {divider}
          <FilterTextField
            label="Utterance"
            placeholder="Search utterances"
            filterValue={filters.utterance}
            setFilterValue={getFilterChangeHandler("utterance")}
          />
          {divider}
          <FilterSlider
            label="Confidence"
            filterRange={[
              filters.confidenceMin ?? 0,
              filters.confidenceMax ?? 1,
            ]}
            setFilterRange={handleConfidenceChange}
          />
          {divider}
          <Box padding={1}>
            <OutlinedInput
              fullWidth
              placeholder="Outcome, label, prediction, smart tag, action"
              sx={{
                borderRadius: theme.spacing(2),
                height: theme.spacing(4),
              }}
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              endAdornment={
                searchValue ? (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }
            />
          </Box>
          {divider}
          <Stack display="block" divider={divider} overflow="hidden auto">
            <FilterSelector
              {...getFilterSelectorProps("outcome")}
              label="Prediction Outcome"
              prettyNames={OUTCOME_PRETTY_NAMES}
            />
            <FilterSelector
              {...getFilterSelectorProps("label")}
              label="Label"
            />
            <FilterSelector
              {...getFilterSelectorProps("prediction")}
              label="Prediction"
            />
            {SMART_TAG_FAMILIES.map((filterName) => (
              <FilterSelector
                key={filterName}
                {...getFilterSelectorProps(filterName)}
                label={
                  <Stack direction="row" gap={1}>
                    {SMART_TAG_FAMILY_PRETTY_NAMES[filterName]}
                    {React.createElement(SMART_TAG_FAMILY_ICONS[filterName])}
                  </Stack>
                }
              />
            ))}
            <FilterSelector
              {...getFilterSelectorProps("dataAction")}
              label="Proposed Action"
            />
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default React.memo(Controls);
