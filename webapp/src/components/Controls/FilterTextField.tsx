import { Clear, Search } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Input,
  InputAdornment,
  Typography,
} from "@mui/material";
import useDebounced from "hooks/useDebounced";
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

  const commitFilterValue = useDebounced(setFilterValue);

  const handleChange = (value: string | undefined) => {
    setLiveValue(value);
    commitFilterValue.debounce(value);
  };

  const handleClear = () => {
    setLiveValue(undefined);
    commitFilterValue.now(undefined);
  };

  return (
    <Box paddingX={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Input
        startAdornment={
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        }
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
        sx={{ marginBottom: 1 }}
      />
    </Box>
  );
};

export default React.memo(FilterTextField);
