import {
  Autocomplete,
  TextField,
  TextFieldProps,
  createFilterOptions,
} from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";
import { DiscardButton } from "./DiscardButton";

const filterOptions = createFilterOptions<string>();

const AutocompleteStringField: React.FC<
  Omit<TextFieldProps, "onChange"> & FieldProps<string> & { options: string[] }
> = ({ value, originalValue, onChange, options, disabled, ...props }) => (
  <Autocomplete
    freeSolo
    disableClearable
    isOptionEqualToValue={() => false}
    options={options}
    filterOptions={(options, params) => {
      const filtered = filterOptions(options, params);

      if (params.inputValue !== "" && !options.includes(params.inputValue)) {
        filtered.push(params.inputValue);
      }

      return filtered;
    }}
    value={value}
    disabled={disabled}
    onChange={(_, newValue) => onChange(newValue as string)}
    // The autoSelect prop would normally cause onChange when onBlur happens,
    // except it doesn't work when the input is empty, so we do it manually.
    onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
      if (event.target.value !== value) {
        onChange(event.target.value);
      }
    }}
    renderInput={(params) => (
      <TextField
        {...params}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <>
              {originalValue !== undefined && (
                <DiscardButton
                  title={String(originalValue)}
                  disabled={disabled || value === originalValue}
                  onClick={() => onChange(originalValue)}
                />
              )}
              {params.InputProps.startAdornment}
            </>
          ),
        }}
        {...FIELD_COMMON_PROPS}
        {...props}
        {...(value.trim() === "" && { error: true, helperText: "Set a value" })}
      />
    )}
  />
);

export default React.memo(AutocompleteStringField);
