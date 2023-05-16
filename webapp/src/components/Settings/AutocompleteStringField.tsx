import { Autocomplete, TextField } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const AutocompleteStringField: React.FC<
  FieldProps<string> & {
    label: string;
    options: string[];
    disabled: boolean;
    errorMessage?: string;
  }
> = ({ value, onChange, label, options, disabled, errorMessage }) => (
  <Autocomplete
    autoSelect
    freeSolo
    disableClearable
    isOptionEqualToValue={() => false}
    options={options}
    value={value}
    disabled={disabled}
    onChange={onChange && ((_, newValue) => onChange(newValue as string))}
    renderInput={(params) => (
      <TextField
        autoFocus
        {...params}
        {...FIELD_COMMON_PROPS}
        label={label}
        error={errorMessage !== null}
        helperText={errorMessage}
      />
    )}
  />
);

export default React.memo(AutocompleteStringField);
