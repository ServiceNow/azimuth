import { Autocomplete, TextField } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const AutocompleteStringField: React.FC<
  FieldProps<string> & { label: string; options: string[]; disabled: boolean }
> = ({ value, onChange, label, options, disabled }) => (
  <Autocomplete
    freeSolo
    options={options}
    value={value}
    disabled={disabled}
    onChange={onChange && ((_, newValue) => onChange(newValue as string))}
    renderInput={(params) => (
      <TextField {...params} {...FIELD_COMMON_PROPS} label={label} />
    )}
  />
);

export default React.memo(AutocompleteStringField);
