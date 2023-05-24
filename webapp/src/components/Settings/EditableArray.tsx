import { AddCircle, DeleteForever } from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  dividerClasses,
} from "@mui/material";
import React from "react";
import { splicedArray } from "./utils";

const EditableArrayDivider: React.FC<{
  disabled: boolean;
  title: string;
  onAdd: () => void;
  onRemove?: () => void;
}> = ({ disabled, title, onAdd, onRemove }) => (
  <Divider
    sx={{
      position: "relative",
      "&::before": { width: (theme) => theme.spacing(2) },
      [`& .${dividerClasses.wrapper}`]: { padding: 0 },
    }}
  >
    <Tooltip title={disabled ? "" : `Add ${title}`}>
      <IconButton
        disabled={disabled}
        onClick={onAdd}
        sx={{ color: (theme) => theme.palette.grey[400] }}
      >
        <AddCircle />
      </IconButton>
    </Tooltip>
    {onRemove && (
      <Box position="absolute" top="calc(50% + 1px)" right={0} zIndex={1}>
        <Tooltip title={disabled ? "" : `Delete ${title}`}>
          <IconButton
            disabled={disabled}
            onClick={onRemove}
            sx={{ color: (theme) => theme.palette.grey[400] }}
          >
            <DeleteForever fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>
    )}
  </Divider>
);

const EditableArray = <T,>({
  array,
  disabled,
  title,
  newItem,
  onChange,
  renderItem,
}: {
  array: T[];
  disabled: boolean;
  title: string;
  newItem: T;
  onChange: (array: T[]) => void;
  renderItem: (item: T, index: number, array: T[]) => React.ReactNode;
}) => (
  <Paper variant="outlined" sx={{ marginBottom: 2 }}>
    {array.map((item, index, array) => (
      <React.Fragment key={index}>
        <EditableArrayDivider
          disabled={disabled}
          title={title}
          onAdd={() => onChange(splicedArray(array, index, 0, newItem))}
          onRemove={() => onChange(splicedArray(array, index, 1))}
        />
        {renderItem(item, index, array)}
      </React.Fragment>
    ))}
    <EditableArrayDivider
      disabled={disabled}
      title={title}
      onAdd={() => onChange([...array, newItem])}
    />
  </Paper>
);

export default EditableArray;
