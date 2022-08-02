import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormControlLabelProps,
  Tooltip,
  Typography,
  TypographyProps,
  useTheme,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import FilterDistribution from "components/Controls/FilterDistribution";
import FilterDistributionTooltipContent from "components/Controls/FilterDistributionTooltipContent";
import SeeMoreLess, {
  INITIAL_NUMBER_VISIBLE,
  useMoreLess,
} from "components/SeeMoreLess";
import { motion } from "framer-motion";
import React from "react";
import { TOOLTIP_ENTER_DELAY } from "styles/const";
import { CountPerFilterValue } from "types/api";

const MotionArrowDropDownIcon = motion(ArrowDropDownIcon);

const titleTypographyProps: TypographyProps = { variant: "subtitle2" };

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
  label: FormControlLabelProps["label"];
  maxCount: number;
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
  searchValue,
  selectedOptions,
  handleValueChange,
  filters,
  isFetching,
  prettyNames,
}: Props<FilterValue>) => {
  const classes = useStyles();
  const theme = useTheme();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

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

  return (
    <>
      <div className={classes.header}>
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={`collapse-${label}`}
          sx={{ padding: 0, minWidth: 0 }}
          disabled={!filters}
        >
          <MotionArrowDropDownIcon
            animate={{ rotate: isCollapsed || !filters ? -90 : 0 }}
            transition={transition}
            className={classes.collapseIcon}
          />
        </Button>
        <FormControlLabel
          className={classes.checkboxGroup}
          control={
            <Checkbox
              checked={someOptionsAreSelected}
              className={classes.checkbox}
              color="primary"
              disabled={!filters} // so it can't be clicked before options are loaded
              indeterminate={someOptionsAreSelected && !allOptionsAreSelected}
              onChange={(_, checked) => handleSelectAll(checked)}
            />
          }
          label={label}
          componentsProps={{ typography: titleTypographyProps }}
        />
        {filters && selectedOptions.length > 0 && (
          <Typography variant="body2" className={classes.selectedCount}>
            ({selectedOptions.length} selected)
          </Typography>
        )}
        {isFetching && (
          <Box flex="1" display="flex" justifyContent="end" marginRight={1}>
            <CircularProgress size="1em" />
          </Box>
        )}
      </div>
      {!isCollapsed && (
        <>
          {options && (
            <motion.ul
              className={classes.options}
              animate={{
                maxHeight: theme.spacing(numberVisible * 3.5),
              }}
              transition={transition}
            >
              {options.map(renderOption)}
            </motion.ul>
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
