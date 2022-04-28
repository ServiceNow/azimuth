import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
  useParams,
} from "react-router-dom";
import { CssBaseline } from "@mui/material";
import {
  Theme,
  ThemeProvider,
  StyledEngineProvider,
} from "@mui/material/styles";
import AppLayout from "components/AppLayout";
import BasicLayout from "components/BasicLayout";
import WarningsOverview from "pages/WarningsOverview";
import UtteranceDetail from "pages/UtteranceDetail";
import customTheme, { GlobalCss } from "styles/theme";
import ErrorBoundary from "components/ErrorBoundary";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import StatusCheck from "components/StatusCheck";
import PipelineCheck from "components/PipelineCheck";
import store from "store";
import { Provider } from "react-redux";
import Dashboard from "pages/Dashboard";
import PerturbationTestingSummary from "pages/PerturbationTestingSummary";
import Threshold from "pages/Threshold";
import { DatasetSplitName } from "types/api";
import Exploration from "pages/Exploration";
import Settings from "pages/Settings";
import NotFound from "pages/NotFound";

declare module "@mui/styles/defaultTheme" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

type Props = {
  basename?: string;
  theme?: Theme;
  onRouteNotFound?: () => void;
};

const DatasetSplitRedirect = () => {
  const { jobId, datasetSplitName } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
  }>();

  return (
    <Redirect
      to={`/${jobId}/dataset_splits/${datasetSplitName}/performance_overview?pipelineIndex=0`}
    />
  );
};

export default class App extends React.Component<Props> {
  render() {
    const { basename = "/", theme = customTheme, onRouteNotFound } = this.props;
    return (
      <Provider store={store}>
        <Router basename={basename}>
          <GlobalCss />
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <AppLayout>
                <ErrorBoundary>
                  <Switch>
                    <Route exact path="/">
                      <Redirect to="/local?pipelineIndex=0" />
                    </Route>
                    <Route path="/:jobId">
                      <StatusCheck>
                        <PipelineCheck>
                          <Switch>
                            <Route path="/:jobId" exact>
                              <BasicLayout maxWidth="md">
                                <Dashboard />
                              </BasicLayout>
                            </Route>
                            <Route path="/:jobId/settings" exact>
                              <BasicLayout>
                                <Settings />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName"
                              exact
                            >
                              <DatasetSplitRedirect />
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/:mainView"
                              exact
                            >
                              <Exploration />
                            </Route>
                            <Route
                              path="/:jobId/behavioral_testing_summary"
                              exact
                            >
                              <BasicLayout>
                                <PerturbationTestingSummary />
                              </BasicLayout>
                            </Route>
                            <Route path="/:jobId/thresholds" exact>
                              <BasicLayout>
                                <Threshold />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_class_distribution_analysis"
                              exact
                            >
                              <BasicLayout>
                                <WarningsOverview />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/utterances/:utteranceId"
                              exact
                            >
                              <BasicLayout>
                                <UtteranceDetail />
                              </BasicLayout>
                            </Route>
                            <Route>
                              {() => {
                                if (onRouteNotFound) {
                                  onRouteNotFound();
                                  return null;
                                }
                                return <NotFound />;
                              }}
                            </Route>
                          </Switch>
                        </PipelineCheck>
                      </StatusCheck>
                    </Route>
                    <Route>
                      {() => {
                        if (onRouteNotFound) {
                          onRouteNotFound();
                          return null;
                        }
                        return <NotFound />;
                      }}
                    </Route>
                  </Switch>
                </ErrorBoundary>
              </AppLayout>
              <ToastContainer />
            </ThemeProvider>
          </StyledEngineProvider>
        </Router>
      </Provider>
    );
  }
}
