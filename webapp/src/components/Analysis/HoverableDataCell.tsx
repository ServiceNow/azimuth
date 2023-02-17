import React from "react";
import { Box, Paper, Popper } from "@mui/material";
import { gridClasses } from "@mui/x-data-grid";

const isOverflown = (element: Element) =>
  element.scrollWidth > element.clientWidth ||
  element.scrollHeight > element.clientHeight;

type GridCellExpandProps = {
  autoWidth?: boolean;
  children: React.ReactNode;
  title?: React.ReactNode; // Named after Tooltip's title prop
};

const HoverableDataCell = (props: GridCellExpandProps) => {
  const { autoWidth = false, children, title } = props;

  const wrapper = React.useRef<HTMLDivElement | null>(null);
  const cellDiv = React.useRef(null);
  const cellValue = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showFullCell, setShowFullCell] = React.useState(false);
  const [showPopper, setShowPopper] = React.useState(false);

  const handleMouseEnter = () => {
    const isCurrentlyOverflown = isOverflown(cellValue.current!);
    // If a title is specified, ignore overflow and always show popper.
    setShowPopper(isCurrentlyOverflown || Boolean(title));
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
    <>
      <Box ref={cellValue} className={gridClasses.cellContent} maxHeight="100%">
        {children}
      </Box>
      <Box
        ref={wrapper}
        height="100%"
        width="100%"
        position="absolute"
        top={0}
        left={0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Box ref={cellDiv} />
      </Box>
      {showPopper && (
        <Popper
          open={showFullCell && anchorEl !== null}
          placement="bottom-start"
          anchorEl={anchorEl}
          style={{
            ...(!autoWidth && { width: wrapper.current!.offsetWidth }),
            pointerEvents: "none", // Because of that, avoid nesting anything
            // that relies on pointer events like click, hover or scroll.
          }}
        >
          <Paper
            elevation={2}
            sx={{
              minHeight: wrapper.current!.offsetHeight,
              padding: "10px",
              paddingBottom: "12px",
              display: "flex",
              alignItems: "center",
              // Replicate some style normally inherited from DataGrid's root.
              // Unfortunately, gridClasses.root doesn't work, so duplicating:
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.55,
              fontFamily: "Gilroy",
              outline: "none",
            }}
          >
            {title || children}
          </Paper>
        </Popper>
      )}
    </>
  );
};

export default React.memo(HoverableDataCell);
