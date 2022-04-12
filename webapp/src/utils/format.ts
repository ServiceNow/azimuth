export function formatRatioAsPercentageString(
  value: number,
  digits: number = 2
) {
  if (isNaN(value)) {
    return "--%";
  }
  const percentage = 100 * value;
  let percentageString = percentage.toFixed(digits);
  if (percentage !== 0 && Number(percentageString) === 0) {
    // Use at least one significant digit, in case the provided fixed number of
    // decimal places fails to produce any significant digit (0%).
    percentageString = percentage.toPrecision(1);
  }
  return `${percentageString}%`;
}
