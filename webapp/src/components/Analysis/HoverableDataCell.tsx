import React from "react";
import { Box, Paper, Popper } from "@mui/material";
import { makeStyles } from "@mui/styles";

function isOverflown(element: Element) {
  return element.scrollWidth > element.clientWidth;
}

type GridCellExpandProps = {
  children: React.ReactNode;
};

const MIN_CELL_WIDTH = 100;

const useStyles = makeStyles((theme) => ({
  root: {
    alignItems: "center",
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    "& .cellValue": {
      whiteSpace: "nowrap",
      wordBreak: "break-all",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  },
  contentWrapper: {
    padding: theme.spacing(2),
    wordBreak: "break-all",
  },
}));

const HoverableDataCell = (props: GridCellExpandProps) => {
  const { children } = props;

  const wrapper = React.useRef<HTMLDivElement | null>(null);
  const cellDiv = React.useRef(null);
  const cellValue = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const classes = useStyles();
  const [showFullCell, setShowFullCell] = React.useState(false);
  const [showPopper, setShowPopper] = React.useState(false);

  const handleMouseEnter = () => {
    const isCurrentlyOverflown = isOverflown(cellValue.current!);
    setShowPopper(isCurrentlyOverflown);
    setAnchorEl(cellDiv.current);
    setShowFullCell(true);
  };

  const handleMouseLeave = () => {
    setShowFullCell(false);
  };

  React.useEffect(() => {
    if (!showFullCell) {
      return undefined;
    }

    function handleKeyDown(nativeEvent: KeyboardEvent) {
      if (nativeEvent.key === "Escape") {
        setShowFullCell(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setShowFullCell, showFullCell]);

  return (
    <div
      ref={wrapper}
      className={classes.root}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Box
        ref={cellDiv}
        height={0}
        width="100%"
        display="block"
        position="absolute"
        top={-1} // compensate row border
      />
      <div ref={cellValue} className="cellValue">
        {children}
      </div>
      {showPopper && (
        <Popper
          open={showFullCell && anchorEl !== null}
          anchorEl={anchorEl}
          style={{
            width: anchorEl ? anchorEl.clientWidth + 20 : MIN_CELL_WIDTH,
            minWidth: MIN_CELL_WIDTH,
            pointerEvents: "none", // Because of that, avoid nesting anything
            // that relies on pointer events like click, hover or scroll.
          }}
        >
          <Paper
            className={classes.contentWrapper}
            elevation={2}
            sx={{
              minHeight: wrapper.current!.offsetHeight - 3,
            }}
          >
            {children}
          </Paper>
        </Popper>
      )}
    </div>
  );
};

export default HoverableDataCell;
