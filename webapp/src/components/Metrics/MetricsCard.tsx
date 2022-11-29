import { MoreHoriz } from "@mui/icons-material";
import { Box, IconButton, Popover } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";

const useStyles = makeStyles((theme) => ({
  popoverContent: {
    padding: theme.spacing(2),
  },
}));

type Props = {
  children: React.ReactNode;
  popover?: React.ReactNode;
  rowCount?: number;
};

const MetricsCard: React.FC<Props> = ({ children, popover, rowCount = 1 }) => {
  const classes = useStyles();

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const open = Boolean(anchorEl);
  const popoverId = open ? "simple-popover" : undefined;

  return (
    <>
      <Box
        display="grid"
        gridAutoFlow="column"
        gridTemplateRows={`repeat(${rowCount}, 1fr)`}
        padding={1}
        position="relative"
        sx={(theme) => ({ backgroundColor: theme.palette.grey[50] })}
      >
        {children}
        {popover && (
          <IconButton
            size="small"
            aria-describedby={popoverId}
            sx={{ position: "absolute", bottom: 0, right: 0 }}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <MoreHoriz />
          </IconButton>
        )}
      </Box>
      {popover && (
        <Popover
          id={popoverId}
          classes={{
            paper: classes.popoverContent,
          }}
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          onClose={() => setAnchorEl(null)}
        >
          {popover}
        </Popover>
      )}
    </>
  );
};

export default React.memo(MetricsCard);
