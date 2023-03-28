export type FieldProps<T> = { value: T; onChange?: (newValue: T) => void };

export const FIELD_COMMON_PROPS = {
  size: "small",
  variant: "standard",
  InputLabelProps: { shrink: true },
} as const;
