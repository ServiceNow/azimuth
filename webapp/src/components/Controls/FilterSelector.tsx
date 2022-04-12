import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { motion } from "framer-motion";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FilterDistribution from "components/Controls/FilterDistribution";
import FilterDistributionTooltipContent from "components/Controls/FilterDistributionTooltipContent";
import { CountPerFilterValue } from "types/api";
import { TOOLTIP_ENTER_DELAY } from "styles/const";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";

const MotionArrowDropDownIcon = motion(ArrowDropDownIcon);

const useStyles = makeStyles((theme) => ({
  header: {
    display: "flex",
    alignItems: "center",
  },
  collapseIcon: {
    cursor: "pointer",
    display: "inherit",
  },
  options: {
    listStyle: "none",
    overflow: "hidden",
    padding: 0,
    marginBottom: theme.spacing(1.5),
    margin: 0,
  },
  option: {
    gridTemplateColumns: "220px auto",
    display: "grid",
    alignItems: "center",
    gap: theme.spacing(0.5),
    margin: theme.spacing(0.5, 1, 0, 0.5),
  },
  checkboxGroup: {
    margin: 0,

    "& > span:last-child": {
      textOverflow: "ellipsis",
      width: "100%",
      overflow: "hidden",
    },

    "&:hover > span:last-child": {
      backgroundColor: "white",
      width: "auto",
      overflow: "initial",
      zIndex: "1",
    },
  },
  checkbox: {
    padding: 0,
    marginRight: theme.spacing(0.5),
  },
  seeMoreLessButtonContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  selectedCount: {
    marginLeft: theme.spacing(1),
  },
}));

type Props<FilterValue> = {
  label: string;
  maxCount: number;
  operator?: "AND" | "OR";
  searchValue: string;
  selectedOptions: FilterValue[];
  handleValueChange: (selectedOptions: FilterValue[]) => void;
  filters?: CountPerFilterValue[] | null;
  isFetching: boolean;
  prettyNames?: Record<string, string>;
};

const FilterSelector = <FilterValue extends string>({
  label,
  maxCount,
  operator = "OR",
  searchValue,
  selectedOptions,
  handleValueChange,
  filters,
  isFetching,
  prettyNames,
}: Props<FilterValue>) => {
  const classes = useStyles();
  const theme = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const options = filters?.filter(({ filterValue }) =>
    filterValue.toLowerCase().includes(searchValue.toLowerCase())
  );

  const numberOfOptions = options?.length || 0;

  const { numberVisible, seeMoreLessProps } = useMoreLess({
    total: numberOfOptions,
    init: INITIAL_NUMBER_VISIBLE,
  });

  const handleSelectAll = (checked: boolean) =>
    handleValueChange(
      (checked && filters?.map((f) => f.filterValue as FilterValue)) || []
    );

  const isOptionSelected = ({ filterValue }: CountPerFilterValue) =>
    selectedOptions.includes(filterValue as FilterValue);

  const someOptionsAreSelected = filters?.some(isOptionSelected) || false;
  const allOptionsAreSelected = filters?.every(isOptionSelected) || false;

  const transition = { type: "tween" };

  const renderOption = (filter: CountPerFilterValue) => {
    const handleSelect = (checked: boolean) =>
      handleValueChange(
        checked
          ? [...selectedOptions, filter.filterValue as FilterValue]
          : selectedOptions.filter((o) => o !== filter.filterValue)
      );

    const prettyName = prettyNames?.[filter.filterValue] ?? filter.filterValue;

    return (
      <motion.li className={classes.option} key={filter.filterValue} layout>
        <FormControlLabel
          className={classes.checkboxGroup}
          control={
            <Checkbox
              checked={selectedOptions.includes(
                filter.filterValue as FilterValue
              )}
              className={classes.checkbox}
              color="primary"
              disabled={
                operator === "AND" &&
                (isFetching || filter.utteranceCount === 0)
              }
              name={filter.filterValue}
              onChange={(_, checked) => handleSelect(checked)}
            />
          }
          label={prettyName}
        />
        <Tooltip
          enterDelay={TOOLTIP_ENTER_DELAY}
          placement="bottom-start"
          title={
            <FilterDistributionTooltipContent
              filterValue={prettyName}
              outcomeCount={filter.outcomeCount}
              utteranceCount={filter.utteranceCount}
            />
          }
        >
          <Box
            alignItems="center"
            display="flex"
            height="100%"
            sx={{
              opacity: isFetching
                ? (theme) => theme.palette.action.disabledOpacity
                : 1,
            }}
          >
            <FilterDistribution maxCount={maxCount} filter={filter} />
          </Box>
        </Tooltip>
      </motion.li>
    );
  };

  const title = <Typography variant="subtitle2">{label}</Typography>;

  return (
    <>
      <div className={classes.header}>
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={`collapse-${label}`}
          sx={{ padding: 0, minWidth: 0 }}
          disabled={!filters && !isFetching}
        >
          <MotionArrowDropDownIcon
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={transition}
            className={classes.collapseIcon}
          />
        </Button>
        {operator === "AND" ? (
          title
        ) : (
          <FormControlLabel
            className={classes.checkboxGroup}
            control={
              <Checkbox
                checked={someOptionsAreSelected}
                className={classes.checkbox}
                color="primary"
                disabled={!filters} // so it can't be clicked before options are loaded
                indeterminate={someOptionsAreSelected && !allOptionsAreSelected}
                name={label}
                onChange={(_, checked) => handleSelectAll(checked)}
              />
            }
            label={title}
          />
        )}
        {selectedOptions.length > 0 && (
          <Typography variant="body2" className={classes.selectedCount}>
            ({selectedOptions.length} selected)
          </Typography>
        )}
      </div>
      {!isCollapsed && (
        <>
          {options ? (
            <motion.ul
              className={classes.options}
              animate={{
                maxHeight: theme.spacing(numberVisible * 3.5),
              }}
              transition={transition}
            >
              {options.map(renderOption)}
            </motion.ul>
          ) : (
            isFetching && <CircularProgress />
          )}
          {numberOfOptions > INITIAL_NUMBER_VISIBLE && (
            <SeeMoreLess {...seeMoreLessProps} />
          )}
        </>
      )}
    </>
  );
};

export default FilterSelector;
