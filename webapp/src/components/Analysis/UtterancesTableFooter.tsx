import React from "react";
import { Box, Typography } from "@mui/material";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import CustomPagination from "components/CustomPagination";
import { GetUtterancesQueryState } from "utils/api";

type Props = {
  selectedIds: number[];
  allDataActions: string[];
  getUtterancesQueryState: GetUtterancesQueryState;
};

const UtterancesTableFooter: React.FC<Props> = ({
  selectedIds,
  allDataActions,
  getUtterancesQueryState,
}) => (
  <Box
    display="flex"
    minHeight="52px"
    alignItems="center"
    justifyContent="space-between"
  >
    <Box
      height="auto"
      marginX={2}
      display="flex"
      alignItems="center"
      visibility={selectedIds.length > 0 ? "visible" : "hidden"}
    >
      <Typography variant="body2" sx={{ marginRight: 1 }}>
        Apply proposed action on {selectedIds.length} rows:
      </Typography>
      <UtteranceDataAction
        utteranceIds={selectedIds}
        confirmationButton
        allDataActions={allDataActions || []}
        getUtterancesQueryState={getUtterancesQueryState}
      />
    </Box>
    <CustomPagination />
  </Box>
);

export default UtterancesTableFooter;
