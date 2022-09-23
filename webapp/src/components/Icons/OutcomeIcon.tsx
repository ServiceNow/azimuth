import { Tooltip } from "@mui/material";
import CheckIcon from "components/Icons/Check";
import XIcon from "components/Icons/X";
import { Outcome } from "types/api";
import { OUTCOME_COLOR, OUTCOME_PRETTY_NAMES } from "utils/const";

const OutcomeIcon: React.FC<{ outcome: Outcome }> = ({ outcome }) => {
  const Icon = outcome.includes("Correct") ? CheckIcon : XIcon;
  return (
    <Tooltip title={OUTCOME_PRETTY_NAMES[outcome]}>
      <Icon
        fontSize="large"
        sx={{
          color: (theme) => theme.palette[OUTCOME_COLOR[outcome]].main,
          height: 56,
        }}
      />
    </Tooltip>
  );
};

export default OutcomeIcon;
