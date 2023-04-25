import { TooltipProps, Tooltip, tooltipClasses, styled } from "@mui/material";

// From https://mui.com/material-ui/react-tooltip/#variable-width
const NoMaxWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: "none",
  },
});

export default NoMaxWidthTooltip;
