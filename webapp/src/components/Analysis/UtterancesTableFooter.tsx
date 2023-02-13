import { Box, Typography } from "@mui/material";
import CustomPagination from "components/CustomPagination";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import React from "react";
import { UtterancePatch } from "types/api";
import { GetUtterancesQueryState } from "utils/api";

type Props = {
  selectedPersistentIds: UtterancePatch["persistentId"][];
  allDataActions: string[];
  getUtterancesQueryState: GetUtterancesQueryState;
};

const UtterancesTableFooter: React.FC<Props> = ({
  selectedPersistentIds,
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
      visibility={selectedPersistentIds.length > 0 ? "visible" : "hidden"}
    >
      <Typography variant="body2" sx={{ marginRight: 1 }}>
        Apply proposed action on {selectedPersistentIds.length} rows:
      </Typography>
      <Box
        display="flex"
        width={277} // Width with the longest option augment_with_similar
      >
        <UtteranceDataAction
          persistentIds={selectedPersistentIds}
          confirmationButton
          allDataActions={allDataActions || []}
          getUtterancesQueryState={getUtterancesQueryState}
        />
      </Box>
    </Box>
    <CustomPagination />
  </Box>
);

export default UtterancesTableFooter;
