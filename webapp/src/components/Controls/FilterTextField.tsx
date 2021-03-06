import { Clear, Search } from "@mui/icons-material";
import {
  Box,
  debounce,
  IconButton,
  Input,
  InputAdornment,
  Typography,
} from "@mui/material";
import React from "react";

type Props = {
  label: string;
  placeholder: string;
  filterValue?: string;
  setFilterValue: (value: string | undefined) => void;
};

const FilterTextField: React.FC<Props> = ({
  label,
  placeholder,
  filterValue,
  setFilterValue,
}) => {
  const [liveValue, setLiveValue] = React.useState(filterValue);

  React.useEffect(() => setLiveValue(filterValue), [filterValue]);

  const setFilterValueDebounced = React.useMemo(
    () => debounce(setFilterValue, 500),
    [setFilterValue]
  );

  // Cancel debounced execution when the component unmounts,
  // for example when navigating to Dashboard while continuously typing.
  React.useEffect(
    () => setFilterValueDebounced.clear,
    [setFilterValueDebounced]
  );

  const handleChange = (value?: string) => {
    setLiveValue(value);
    setFilterValueDebounced(value);
  };

  const handleClear = () => {
    setLiveValue(undefined);
    // Clear filter value with no delay.
    setFilterValue(undefined);
    setFilterValueDebounced.clear();
  };

  return (
    <Box paddingX={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Box display="flex" alignItems="center" gap={1} paddingY={1}>
        <Search />
        <Input
          endAdornment={
            liveValue ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear}>
                  <Clear />
                </IconButton>
              </InputAdornment>
            ) : null
          }
          fullWidth
          placeholder={placeholder}
          value={liveValue ?? ""}
          onChange={(event) => handleChange(event.target.value || undefined)}
        />
      </Box>
    </Box>
  );
};

export default React.memo(FilterTextField);
