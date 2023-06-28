import { MenuItem, TextField, TextFieldProps } from "@mui/material";
import { FieldProps, FIELD_COMMON_PROPS } from "./utils";
import { DiscardButton } from "./DiscardButton";

const StringField = <T extends string | null>({
  value,
  originalValue,
  onChange,
  nullable,
  options,
  ...props
}: Omit<TextFieldProps, "onChange"> &
  FieldProps<T> &
  (null extends T
    ? { nullable: true; options?: never }
    : { nullable?: false } & (string extends T // so T is string, not a literal
        ? { select?: false; options?: never }
        : { select?: true; options: readonly NonNullable<T>[] }))) => (
  <TextField
    {...FIELD_COMMON_PROPS}
    {...(nullable && { placeholder: "null" })}
    select={Boolean(options)}
    inputProps={{ sx: { textOverflow: "ellipsis" } }}
    value={value ?? ""}
    required={!nullable && !options}
    {...(value?.trim() === "" && { error: true, helperText: "Set a value" })}
    InputProps={{
      startAdornment:
        originalValue === undefined ? null : (
          <DiscardButton
            title={String(originalValue)}
            disabled={props.disabled || value === originalValue}
            onClick={() => onChange(originalValue)}
          />
        ),
    }}
    onChange={
      nullable
        ? (event) => onChange((event.target.value || null) as T)
        : (event) => onChange(event.target.value as T)
    }
    {...props}
  >
    {options?.map((option) => (
      <MenuItem key={option} value={option}>
        {option}
      </MenuItem>
    ))}
  </TextField>
);

export default StringField;
