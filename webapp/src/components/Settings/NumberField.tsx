import { InputAdornment, TextField, TextFieldProps } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const NumberField: React.FC<
  Omit<TextFieldProps, "onChange"> &
    FieldProps<number> & { scale?: number; units?: string }
> = ({ value, scale = 1, units, onChange, ...props }) => {
  // Control value with a `string` (and not with a `number`) so that for example
  // when hitting backspace at the end of `0.01`, you get `0.0` (and not `0`).
  const [stringValue, setStringValue] = React.useState(String(value * scale));

  React.useEffect(() => {
    if (value !== Number(stringValue) / scale) {
      setStringValue(String(value * scale));
    }
  }, [value, scale, stringValue]);

  const helperText = React.useMemo(() => {
    if (props.inputProps === undefined) {
      return;
    }

    let prop;
    if (value * scale < props.inputProps.min) {
      prop = "min";
    } else if (value * scale > props.inputProps.max) {
      prop = "max";
    } else {
      return;
    }

    const limit = props.inputProps[prop];
    return `Set ${prop}imum ${limit}${
      units ? ` ${limit === 1 ? units.replace(/s$/, "") : units}` : ""
    }`;
  }, [props.inputProps, scale, units, value]);

  return (
    <TextField
      {...FIELD_COMMON_PROPS}
      type="number"
      title="" // Overwrite any default input validation tooltip
      value={stringValue}
      error={helperText !== undefined}
      helperText={helperText}
      InputProps={{
        sx: { maxWidth: "12ch" },
        endAdornment: units && (
          <InputAdornment position="end">{units}</InputAdornment>
        ),
      }}
      onChange={(event) => {
        setStringValue(event.target.value);
        onChange && onChange(Number(event.target.value) / scale);
      }}
      {...props}
    />
  );
};

export default React.memo(NumberField);
