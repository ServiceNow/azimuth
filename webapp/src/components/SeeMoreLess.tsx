import React from "react";
import { Box, Button } from "@mui/material";

const MORE_LESS_STEP = 15;
export const INITIAL_NUMBER_VISIBLE = 5;

type SeeMoreLessProps = {
  onClickShowMore: () => void;
  onClickShowLess: () => void;
  nextStepUp: number;
  showLessVisible: boolean;
};

const SeeMoreLess: React.FC<SeeMoreLessProps> = ({
  nextStepUp,
  showLessVisible,
  onClickShowMore,
  onClickShowLess,
}) => {
  return (
    <Box>
      <Button
        disabled={nextStepUp < 1}
        color="primary"
        onClick={onClickShowMore}
      >
        See more ({nextStepUp})
      </Button>
      <Button
        sx={{
          visibility: showLessVisible ? "visible" : "hidden",
        }}
        color="primary"
        onClick={onClickShowLess}
      >
        See less
      </Button>
    </Box>
  );
};

type MoreLessHookParams = {
  init: number;
  total: number;
  stepSize?: number;
};

type MoreLessHookResponse = {
  numberVisible: number;
  seeMoreLessProps: SeeMoreLessProps;
};

export function useMoreLess({
  init,
  total,
  stepSize = MORE_LESS_STEP,
}: MoreLessHookParams): MoreLessHookResponse {
  const [numberRequested, setNumberRequested] = React.useState(init);
  const onClickShowMore = React.useCallback(
    () => setNumberRequested(numberRequested + stepSize),
    [numberRequested, stepSize, setNumberRequested]
  );
  const onClickShowLess = React.useCallback(
    () => setNumberRequested(numberRequested - stepSize),
    [numberRequested, stepSize, setNumberRequested]
  );

  const numberVisible = Math.min(numberRequested, total);
  const showLessVisible = numberRequested > init;
  const nextStepUp = Math.min(total - numberVisible, stepSize);

  const moreLessProps: SeeMoreLessProps = React.useMemo(
    () => ({
      nextStepUp,
      showLessVisible,
      onClickShowMore,
      onClickShowLess,
    }),
    [nextStepUp, showLessVisible, onClickShowMore, onClickShowLess]
  );

  return {
    numberVisible,
    seeMoreLessProps: moreLessProps,
  };
}

export default React.memo(SeeMoreLess);
