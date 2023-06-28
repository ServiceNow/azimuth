import { Replay } from "@mui/icons-material";
import { InputAdornment, Tooltip, IconButton } from "@mui/material";

export const DiscardButton: React.FC<{
  title: string;
  disabled: boolean;
  onClick: () => void;
}> = ({ title, ...props }) => (
  <InputAdornment position="end" sx={{ marginLeft: 0, marginRight: "-20px" }}>
    <Tooltip
      placement="bottom-end"
      title={props.disabled ? "" : `Discard change, reset to ${title}`}
    >
      <IconButton color="secondary" sx={{ padding: 0 }} {...props}>
        <Replay />
      </IconButton>
    </Tooltip>
  </InputAdornment>
);
