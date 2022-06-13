import { Theme } from "@emotion/react";
import { createTheme } from "@mui/material";
import withStyles from "@mui/styles/withStyles";
import "styles/typography/gilroy/gilroy.css";

export const GlobalCss = withStyles({
  "@global": {
    ".Toastify__toast--success": {
      color: "#293E40",
      background: "#b0e2ce",
    },
    ".Toastify__toast--error": {
      background: "#c93c36",
    },
  },
})(() => null);

const defaultTheme = createTheme();

const customTheme: Theme = createTheme({
  palette: {
    background: {
      default: "#fafafa", // TODO awaiting design input.
    },
    primary: {
      light: "#3C3A57",
      main: "#252436",
      dark: "#0F0F17",
    },
    secondary: {
      light: "#63CCFF",
      main: "#03A9F4",
      dark: "#006DB3",
      contrastText: "white",
    },
    success: {
      main: "#00B686",
    },
    info: {
      main: "#456857",
    },
    warning: {
      main: "#FD9700",
    },
    error: {
      main: "#E32437",
    },
    text: {
      primary: "#293E40", // TODO awaiting design input.
      secondary: "#293E40", // TODO awaiting design input.
    },
  },
  breakpoints: {
    values: {
      ...defaultTheme.breakpoints.values,
      md: 1440, // MacBook Pro 14 with default resolution
      lg: 1792, // MacBook Pro 16 with default resolution
      xl: 1920,
    },
  },
  typography: {
    fontFamily: "Gilroy",
    h1: {
      fontSize: 48,
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h2: {
      fontSize: 34,
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h3: {
      fontSize: 24,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h4: {
      fontSize: 20,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.7,
    },
    body1: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.55,
    },
    button: {
      textTransform: "none",
    },
    caption: {
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.33,
    },
    overline: {
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: "1.5px",
      lineHeight: 1.33,
    },
  },
  components: {
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fontSize: 20,
        },
        fontSizeSmall: {
          fontSize: 16,
        },
        fontSizeLarge: {
          fontSize: 24,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "unset",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "unset",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: "normal",
          fontSize: 16,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        popper: {
          pointerEvents: "none",
        },
      },
    },
  },
});

export default customTheme;
