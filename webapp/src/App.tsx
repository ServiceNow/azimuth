import { CssBaseline } from "@mui/material";
import {
  StyledEngineProvider,
  Theme,
  ThemeProvider,
} from "@mui/material/styles";
import AppLayout from "components/AppLayout";
import BasicLayout from "components/BasicLayout";
import ErrorBoundary from "components/ErrorBoundary";
import PageHeader from "components/PageHeader";
import PipelineCheck from "components/PipelineCheck";
import StatusCheck from "components/StatusCheck";
import ClassOverlap from "pages/ClassOverlap";
import Dashboard from "pages/Dashboard";
import Exploration from "pages/Exploration";
import NotFound from "pages/NotFound";
import PerformanceAnalysis from "pages/PerformanceAnalysis";
import PerturbationTestingSummary from "pages/PerturbationTestingSummary";
import SmartTags from "pages/SmartTags";
import Threshold from "pages/Threshold";
import UtteranceDetails from "pages/UtteranceDetails";
import WarningsOverview from "pages/WarningsOverview";
import React from "react";
import { Provider } from "react-redux";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
  useParams,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import store from "store";
import customTheme, { GlobalCss } from "styles/theme";
import { DatasetSplitName } from "types/api";

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
      to={`/${jobId}/dataset_splits/${datasetSplitName}/prediction_overview?pipeline_index=0`}
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
                      <Redirect to="/local?pipeline_index=0" />
                    </Route>
                    <Route path="/:jobId">
                      <StatusCheck>
                        <PipelineCheck>
                          <PageHeader />
                          <Switch>
                            <Route path="/:jobId" exact>
                              <BasicLayout maxWidth="md">
                                <Dashboard />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/class_overlap"
                              exact
                            >
                              <BasicLayout maxWidth="md">
                                <ClassOverlap />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/pipeline_metrics"
                              exact
                            >
                              <BasicLayout>
                                <PerformanceAnalysis />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/smart_tags"
                              exact
                            >
                              <BasicLayout>
                                <SmartTags />
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
                            <Route path="/:jobId/dataset_warnings" exact>
                              <BasicLayout>
                                <WarningsOverview />
                              </BasicLayout>
                            </Route>
                            <Route
                              path="/:jobId/dataset_splits/:datasetSplitName/utterances/:utteranceId"
                              exact
                            >
                              <BasicLayout>
                                <UtteranceDetails />
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
