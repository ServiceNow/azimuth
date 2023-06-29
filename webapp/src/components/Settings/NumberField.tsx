import { TextField, TextFieldProps, Typography } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";
import { DiscardButton } from "./DiscardButton";

const NumberField: React.FC<
  Omit<TextFieldProps, "onChange"> &
    FieldProps<number> & { scale?: number; units?: string }
> = ({ value, originalValue, scale = 1, units, onChange, ...props }) => {
  // Control value with a `string` (and not with a `number`) so that for example
  // when hitting backspace at the end of `0.01`, you get `0.0` (and not `0`).
  const [stringValue, setStringValue] = React.useState(String(value * scale));

  React.useEffect(() => {
    if (value !== Number(stringValue) / scale) {
      setStringValue(String(value * scale));
    }
  }, [value, scale, stringValue]);

  const formatNumber = React.useCallback(
    (x: number) =>
      `${x}${units ? ` ${x === 1 ? units.replace(/s$/, "") : units}` : ""}`,
    [units]
  );

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
    return `Set ${prop}imum ${formatNumber(limit)}`;
  }, [props.inputProps, scale, value, formatNumber]);

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
        endAdornment: (
          <>
            {units && (
              // If we put text in an <InputAdornment>, it gets a different font size and color (that doesn't get disabled).
              <Typography variant="inherit" marginLeft={1}>
                {units}
              </Typography>
            )}
            {originalValue !== undefined && originalValue !== value && (
              <DiscardButton
                title={formatNumber(originalValue * scale)}
                disabled={props.disabled}
                onClick={() => onChange(originalValue)}
              />
            )}
          </>
        ),
      }}
      onChange={(event) => {
        setStringValue(event.target.value);
        onChange(Number(event.target.value) / scale);
      }}
      {...props}
    />
  );
};

export default React.memo(NumberField);
