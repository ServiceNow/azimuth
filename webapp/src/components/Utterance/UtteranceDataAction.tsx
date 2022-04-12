import { Box, Button, CircularProgress, MenuItem, Select } from "@mui/material";
import React, { useState } from "react";
import { updateDataActionsEndpoint } from "services/api";
import { DataAction } from "types/api";
import { GetUtterancesQueryState } from "utils/api";

type Props = {
  utteranceIds: number[];
  dataAction?: DataAction;
  confirmationButton?: boolean;
  allDataActions: string[];
  getUtterancesQueryState: GetUtterancesQueryState;
};

const UtteranceDataAction: React.FC<Props> = ({
  utteranceIds,
  dataAction,
  confirmationButton,
  allDataActions,
  getUtterancesQueryState,
}) => {
  const [newDataAction, setNewDataAction] = useState<DataAction | "">("");

  const [updateDataAction] = updateDataActionsEndpoint.useMutation();

  const handleDataActionChange = (newValue: DataAction) => {
    updateDataAction({
      ids: utteranceIds,
      newValue,
      allDataActions,
      ...getUtterancesQueryState,
    });
  };

  const [menuValue, setMenuValue] = confirmationButton
    ? [newDataAction, setNewDataAction]
    : [dataAction, handleDataActionChange];

  const menuItems = allDataActions.length
    ? allDataActions
    : dataAction
    ? [dataAction] // We know the selected value has to be in the list
    : [];

  return (
    <>
      <Select
        value={menuValue}
        onChange={(e) => setMenuValue(e.target.value as DataAction)}
        onClose={(e) => e.preventDefault()}
        size="small"
        sx={{ width: 172 }}
      >
        {menuItems.map((tag) => (
          <MenuItem key={tag} value={tag} onClick={(e) => e.preventDefault()}>
            {tag}
          </MenuItem>
        ))}
        {!allDataActions.length && (
          <Box
            display="flex"
            justifyContent="center"
            padding={1}
            sx={{ pointerEvents: "none" }} // Prevents clicking, since that is not a menu item
          >
            <CircularProgress size={20} />
          </Box>
        )}
      </Select>
      {confirmationButton && (
        <Button
          color="primary"
          variant="contained"
          onClick={() => newDataAction && handleDataActionChange(newDataAction)}
          disabled={!newDataAction}
          sx={{ marginLeft: 1 }}
        >
          Apply
        </Button>
      )}
    </>
  );
};

export default React.memo(UtteranceDataAction);
