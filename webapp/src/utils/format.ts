export const formatNumberAsString = (value: number, digits: number = 2) => {
  if (isNaN(value)) return "--";

  const fixed = value.toFixed(digits);
  // Use at least one significant digit, in case the provided fixed number of
  // decimal places fails to produce any significant digit (for example "0.00").
  return value !== 0 && Number(fixed) === 0 ? value.toPrecision(1) : fixed;
};

export const formatRatioAsPercentageString = (
  value: number,
  digits: number = 2
) => `${formatNumberAsString(100 * value, digits)}%`;

const pad = (n: number) => String(n).padStart(2, "0");

export const formatDateISO = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

export const camelToTitleCase = (camelCase: string) =>
  // Safari and iOS browsers don't support lookbehind in regular expressions.
  camelCase.replace(/([a-z])(?=[A-Z0-9])|([A-Z0-9])(?=[A-Z][a-z])/g, "$& ");
