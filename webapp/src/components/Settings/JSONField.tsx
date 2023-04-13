import { TextFieldProps, TextField, Typography } from "@mui/material";
import React from "react";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";

const stringifyJSON = (value: unknown, spaces = 2) =>
  JSON.stringify(value, null, spaces)
    .slice(2, -2) // Remove enclosing brackets or braces, and newlines
    .replace(new RegExp(`^ {${spaces}}`, "gm"), ""); // Unindent

const JSONField: React.FC<
  Omit<TextFieldProps, "onChange"> &
    (
      | ({ array: true } & FieldProps<any[]>)
      | ({ array?: false } & FieldProps<Record<string, unknown>>)
    )
> = ({ value, onChange, array, ...props }) => {
  const [stringValue, setStringValue] = React.useState(stringifyJSON(value));

  React.useEffect(() => setStringValue(stringifyJSON(value)), [value]);

  const [errorText, setErrorText] = React.useState("");

  const adornments = array ? (["[", "]"] as const) : (["{", "}"] as const);

  const handleChange = (newStringValue: string) => {
    setStringValue(newStringValue);
    // Update errorText if there is one, but wait for blur to add one.
    if (errorText) {
      try {
        JSON.parse(adornments.join(newStringValue));
        setErrorText("");
      } catch (error) {
        setErrorText((error as SyntaxError).message);
      }
    }
  };

  const handleBlur =
    onChange &&
    ((newStringValue: string) => {
      try {
        onChange(JSON.parse(adornments.join(newStringValue)));
      } catch (error) {
        setErrorText((error as SyntaxError).message);
      }
    });

  return (
    <TextField
      {...FIELD_COMMON_PROPS}
      multiline
      value={stringValue}
      error={errorText !== ""}
      helperText={errorText}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur && ((event) => handleBlur(event.target.value))}
      InputProps={{
        startAdornment: (
          <Typography variant="inherit" alignSelf="start">
            {adornments[0]}&nbsp;
          </Typography>
        ),
        endAdornment: (
          <Typography variant="inherit" alignSelf="end">
            &nbsp;{adornments[1]}
          </Typography>
        ),
      }}
      {...props}
    />
  );
};

export default React.memo(JSONField);
