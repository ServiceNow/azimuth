import { Box, Typography } from "@mui/material";

const BinLabel: React.FC = ({ children }) => (
  <Box
    width={(theme) => theme.spacing(0.5)}
    height="100%"
    display="flex"
    alignItems="center"
    justifyContent="center"
    sx={{
      // First and last labels outside of the box.
      "&:first-of-type": {
        position: "absolute",
        right: "100%",
      },
      "&:last-of-type": {
        position: "absolute",
        left: "100%",
      },
    }}
  >
    <Typography fontSize={12}>{children}</Typography>
  </Box>
);

export default BinLabel;
