import { Box, Typography } from "@mui/material";
import { CountPerFilterValue } from "types/api";
import { ALL_OUTCOMES, OUTCOME_PRETTY_NAMES } from "utils/const";

const Row: React.FC = ({ children }) => (
  <Box display="flex" justifyContent="space-between" gap={1}>
    {children}
  </Box>
);

const FilterDistributionTooltipContent: React.FC<CountPerFilterValue> = ({
  filterValue,
  outcomeCount,
  utteranceCount,
}) => (
  <>
    <Row>
      <Typography fontWeight="bold">{filterValue}:</Typography>
      <Typography fontWeight="bold">{utteranceCount}</Typography>
    </Row>
    {outcomeCount &&
      ALL_OUTCOMES.map((outcome) => (
        <Row key={outcome}>
          <Typography>{OUTCOME_PRETTY_NAMES[outcome]}:</Typography>
          <Typography>{outcomeCount[outcome]}</Typography>
        </Row>
      ))}
  </>
);

export default FilterDistributionTooltipContent;
