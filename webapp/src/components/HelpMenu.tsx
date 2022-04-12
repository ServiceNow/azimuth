import { ContactSupport, Help, MenuBook } from "@mui/icons-material";
import {
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Menu,
  Link,
} from "@mui/material";
import React from "react";

const HelpMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        color="primary"
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ padding: 0 }}
      >
        <Help />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{ "aria-labelledby": "basic-button" }}
      >
        <Link href="https://servicenow.github.io/azimuth" target="_blank">
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <MenuBook color="primary" />
            </ListItemIcon>
            <ListItemText>Product Documentation</ListItemText>
          </MenuItem>
        </Link>
        <Link
          href="https://join.slack.com/t/newworkspace-5wx1461/shared_invite/zt-16x8eqt1h-ho3Hh6ilcN7FpZyLkjr9oA"
          target="_blank"
        >
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <ContactSupport color="primary" />
            </ListItemIcon>
            <ListItemText>Support & Feedback</ListItemText>
          </MenuItem>
        </Link>
      </Menu>
    </>
  );
};

export default React.memo(HelpMenu);
