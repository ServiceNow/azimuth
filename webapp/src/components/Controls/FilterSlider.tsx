import { Box, Slider, Typography } from "@mui/material";
import React from "react";

const step = 5;
const marks = Array.from(Array(100 / step + 1), (_, i) => i * step).map(
  (value) => ({ value, label: value % 100 === 0 && `${value}%` })
);

type Range = [number, number];

const areDifferent = (a: Range, b: Range) => a.some((n, i) => n !== b[i]);

type Props = {
  label: string;
  filterRange: Range;
  setFilterRange: (range: Range) => void;
};

const FilterSlider: React.FC<Props> = ({
  label,
  filterRange,
  setFilterRange,
}) => {
  const filterRangePercentage = React.useMemo(
    // Rounding to mitigate floating point errors
    // Keeping some decimals in case the user specified some in the URL
    () => filterRange.map((value) => Math.round(value * 10000) / 100) as Range,
    [filterRange]
  );

  const [range, setRange] = React.useState<Range>(filterRangePercentage);

  React.useEffect(
    () => setRange(filterRangePercentage),
    [filterRangePercentage]
  );

  const onChange = (newRange: Range) => {
    if (areDifferent(newRange, range)) {
      setRange(newRange);
    }
  };

  const onChangeCommitted = (newRange: Range) => {
    if (areDifferent(newRange, filterRange)) {
      if (newRange[0] === newRange[1]) {
        // Reset slider if newRange is collapsed
        setRange(filterRangePercentage);
      } else {
        setFilterRange(newRange.map((value) => value / 100) as Range);
      }
    }
  };

  return (
    <Box paddingX={1}>
      <Box display="flex" gap={1} alignItems="center">
        <Typography variant="subtitle2">{label}</Typography>
        {(range[0] > 0 || range[1] < 100) && (
          <Typography variant="body2">
            ({range.map((value) => `${value}%`).join(" to ")})
          </Typography>
        )}
      </Box>
      <Box paddingX={2}>
        <Slider
          aria-labelledby={label}
          size="small"
          step={step}
          marks={marks}
          value={range}
          onChange={(_, value) => onChange(value as Range)}
          onChangeCommitted={(_, value) => onChangeCommitted(value as Range)}
        />
      </Box>
    </Box>
  );
};

export default FilterSlider;
