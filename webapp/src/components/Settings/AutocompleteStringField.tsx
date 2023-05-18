import { Autocomplete, TextField, TextFieldProps } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const AutocompleteStringField: React.FC<
  Omit<TextFieldProps, "onChange"> & FieldProps<string> & { options: string[] }
> = ({ value, onChange, options, disabled, ...props }) => (
  <Autocomplete
    freeSolo
    disableClearable
    isOptionEqualToValue={() => false}
    options={options}
    value={value}
    disabled={disabled}
    onChange={onChange && ((_, newValue) => onChange(newValue as string))}
    // The autoSelect prop would normally cause onChange when onBlur happens,
    // except it doesn't work when the input is empty, so we do it manually.
    onBlur={
      onChange &&
      ((event: React.FocusEvent<HTMLInputElement>) => {
        if (event.target.value !== value) {
          onChange(event.target.value);
        }
      })
    }
    renderInput={(params) => (
      <TextField
        {...params}
        {...FIELD_COMMON_PROPS}
        {...props}
        {...(value === "" && { error: true, helperText: "Set a value" })}
      />
    )}
  />
);

export default React.memo(AutocompleteStringField);
