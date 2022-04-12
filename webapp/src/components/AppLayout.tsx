import { Box } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import logo from "assets/logo.svg";

import { HEADER_HEIGHT } from "styles/const";

const useStyles = makeStyles((theme) => ({
  "@global": {
    "html, body, #root": {
      height: "100%",
      color: theme.palette.primary.main,
    },
  },
  headText: {
    color: "white",
    lineHeight: 1,
  },
  appLayoutMain: {
    width: "100%",
    flex: 1,

    minHeight: 0,
    overflow: "hidden",
    "& a": {
      textDecoration: "none",
    },
    display: "flex",
    flexDirection: "column",
  },
  header: {
    backgroundColor: theme.palette.primary.dark,
    height: HEADER_HEIGHT,
  },
  headerFrame: {
    display: "flex",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: "auto",
    position: "relative",
    height: "100%",
    "&::after": {
      content: "''",
      position: "absolute",
      width: "100%",
      height: "100%",
    },
  },
  logo: {
    height: "24px",
    marginLeft: theme.spacing(3),
  },
}));

const AppLayout = (props: { children: React.ReactNode }) => {
  const classes = useStyles();
  return (
    <Box
      id="app-layout-root"
      display="flex"
      flexDirection="column"
      width="100%"
      height="100%"
      // The size of the visualViewport in Chrome with navigation bar and
      // bookmarks bar on a MacBook Pro 14 with default resolution:
      minWidth={1440}
      minHeight={789} // 900 - 111
    >
      <header className={classes.header}>
        <div className={classes.headerFrame}>
          <img className={classes.logo} src={logo} alt="logo" />
        </div>
      </header>
      <main className={classes.appLayoutMain}>{props.children}</main>
    </Box>
  );
};

export default AppLayout;
