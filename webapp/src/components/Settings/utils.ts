export type FieldProps<T> = { value: T; onChange?: (newValue: T) => void };

export const FIELD_COMMON_PROPS = {
  size: "small",
  variant: "standard",
  InputLabelProps: { shrink: true },
} as const;

// Similar to Array.prototype.splice(), but returning a copy instead of modifying in place.
export const splicedArray = <T>(
  array: T[],
  start: number,
  deleteCount: number,
  ...insert: T[]
) => [...array.slice(0, start), ...insert, ...array.slice(start + deleteCount)];
