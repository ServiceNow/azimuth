import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Switch,
  Typography,
  useTheme,
} from "@mui/material";
import {
  QueryFilterState,
  QueryPaginationState,
  QueryPipelineState,
  QueryPostprocessingState,
} from "types/models";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { motion } from "framer-motion";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import { DatasetSplitName } from "types/api";
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
import SwitchToggler from "./SwitchToggler";
import FilterSelector from "./FilterSelector";
import FilterSlider from "./FilterSlider";
import FilterTextField from "./FilterTextField";
import { OUTCOME_PRETTY_NAMES } from "../../utils/const";

const MotionChevronLeftIcon = motion(ChevronLeftIcon);

type Props = {
  filters: QueryFilterState;
  pagination: QueryPaginationState;
  pipeline: QueryPipelineState;
  postprocessing: QueryPostprocessingState;
  searchString: string;
};

const Controls: React.FC<Props> = ({
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

  const { data: countPerFilter, isFetching: isFetchingCountPerFilter } =
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

  const selectedLabels = filters.labels || [];
  const selectedPredictions = filters.predictions || [];
  const selectedSmartTags = filters.smartTags || [];
  const selectedDataActions = filters.dataActions || [];

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
        ...pagination,
        ...pipeline,
        ...postprocessing,
      })}`
    );
  };

  const handleFilterChange = (filters: QueryFilterState) =>
    history.push(
      `${baseUrl}${constructSearchString({
        ...filters,
        ...pagination,
        ...pipeline,
        ...postprocessing,
      })}`
    );

  const handleFilterSelectorChange =
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

  const handlePostprocessingChange = (enable: boolean) =>
    history.push(
      `${baseUrl}${constructSearchString({
        ...filters,
        ...pagination,
        ...pipeline,
        withoutPostprocessing: enable || undefined,
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

  const divider = (
    <Box marginY={1} borderBottom="1px solid rgba(0, 0, 0, 0.12)" />
  );

  return (
    <Box
      component={motion.div}
      border="1px solid rgba(0, 0, 0, 0.12)"
      boxSizing="content-box"
      display="grid"
      gridTemplateRows={`${theme.spacing(5)} auto ${theme.spacing(
        6
      )} auto auto auto`}
      overflow="hidden"
      alignContent="flex-start"
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
            <FormControlLabel
              control={
                <Switch
                  checked={postprocessing.withoutPostprocessing ?? false}
                  onChange={(_, checked) => handlePostprocessingChange(checked)}
                />
              }
              label="Without PostProcessing"
            />
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            margin={1}
            marginBottom={0}
            marginTop={2}
          >
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
            setFilterValue={handleFilterSelectorChange("utterance")}
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
          <Box marginTop={1} sx={{ overflowY: "auto", overflowX: "hidden" }}>
            <>
              <FilterSelector
                label="Prediction Outcome"
                maxCount={maxCount}
                searchValue={searchValue}
                selectedOptions={filters.outcomes || []}
                handleValueChange={handleFilterSelectorChange("outcomes")}
                filters={countPerFilter?.countPerFilter.outcome}
                isFetching={isFetchingCountPerFilter}
                prettyNames={OUTCOME_PRETTY_NAMES}
              />
              {divider}
              <FilterSelector
                label="Label"
                maxCount={maxCount}
                searchValue={searchValue}
                selectedOptions={selectedLabels}
                handleValueChange={handleFilterSelectorChange("labels")}
                filters={countPerFilter?.countPerFilter.label}
                isFetching={isFetchingCountPerFilter}
              />
              {divider}
              <FilterSelector
                label="Prediction"
                maxCount={maxCount}
                searchValue={searchValue}
                selectedOptions={selectedPredictions}
                handleValueChange={handleFilterSelectorChange("predictions")}
                filters={countPerFilter?.countPerFilter.prediction}
                isFetching={isFetchingCountPerFilter}
              />
              {divider}
              <FilterSelector
                label="Smart Tags"
                maxCount={maxCount}
                operator="AND"
                searchValue={searchValue}
                selectedOptions={selectedSmartTags}
                handleValueChange={handleFilterSelectorChange("smartTags")}
                filters={countPerFilter?.countPerFilter.smartTag}
                isFetching={isFetchingCountPerFilter}
              />
              {divider}
              <FilterSelector
                label="Proposed Action"
                maxCount={maxCount}
                searchValue={searchValue}
                selectedOptions={selectedDataActions}
                handleValueChange={handleFilterSelectorChange("dataActions")}
                filters={countPerFilter?.countPerFilter.dataAction}
                isFetching={isFetchingCountPerFilter}
              />
            </>
          </Box>
        </>
      )}
    </Box>
  );
};

export default React.memo(Controls);
