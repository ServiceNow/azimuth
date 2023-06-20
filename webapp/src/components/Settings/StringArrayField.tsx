import {
  Autocomplete,
  TextField,
  Chip,
  autocompleteClasses,
  chipClasses,
} from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const StringArrayField: React.FC<
  FieldProps<string[]> & { label?: string; units?: string; disabled: boolean }
> = ({ value, onChange, label, units = label || "token", disabled }) => (
  <Autocomplete
    disableClearable
    freeSolo
    multiple
    options={[]}
    value={value}
    disabled={disabled}
    onChange={onChange && ((_, newValue) => onChange(newValue as string[]))}
    renderInput={(params) => (
      <TextField
        {...params}
        {...FIELD_COMMON_PROPS}
        label={label}
        helperText={
          <>
            Write a{/^[aeiou]/.test(units) && "n"} {units} and press enter
          </>
        }
      />
    )}
    renderTags={(value, getTagProps) =>
      value.map((option, index) => (
        <Chip size="small" label={option} {...getTagProps({ index })} />
      ))
    }
    sx={{
      [`& .${autocompleteClasses.inputRoot}`]: {
        gap: 0.5,
        [`& .${autocompleteClasses.tag}`]: {
          height: 20,
          margin: 0,
          [`& .${chipClasses.deleteIcon}`]: {
            marginLeft: "-6px",
            marginRight: "2px",
          },
        },
      },
    }}
  />
);

export default React.memo(StringArrayField);
