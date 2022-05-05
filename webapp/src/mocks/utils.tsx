import { render } from "@testing-library/react";
import { Route, Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import React from "react";
import { Provider } from "react-redux";
import { storeBuilder } from "store";
import { ThemeProvider } from "@mui/material";
import theme from "styles/theme";

export function renderWithRouterAndRedux(
  children: React.ReactNode,
  {
    path = "/",
    route = "/",
    history = createMemoryHistory({ initialEntries: [route] }),
  }: { path?: string; route?: string; history?: any } = {}
) {
  return {
    ...render(
      <Provider store={storeBuilder()}>
        <Router history={history}>
          <Route path={path}>{children}</Route>
        </Router>
      </Provider>
    ),
  };
}

// TODO: some questions to think about:
// 1. why is this suddenly necessary with the migration to MUI v5?
// 2. when we have changed over to the new way of doing css is it still necessary?
export function renderWithTheme(children: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{children}</ThemeProvider>);
}
