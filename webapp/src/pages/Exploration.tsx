import { Box, Paper, Tab, Tabs } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import UtterancesTable from "components/Analysis/UtterancesTable";
import ConfidenceHistogramTopWords from "components/ConfidenceHistogramTopWords";
import ConfusionMatrix from "components/ConfusionMatrix";
import Controls from "components/Controls/Controls";
import Metrics from "components/Metrics/Metrics";
import PageHeader from "components/PageHeader";
import TabPipelineRequired from "components/TabPipelineRequired";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { isPipelineSelected } from "utils/helpers";

const useStyles = makeStyles((theme) => ({
  container: {
    height: "100%",
    minHeight: 0,
    boxShadow: "0 0px 10px 0px rgb(0 0 0 / 20%)",
  },
  layout: {
    height: "100%",
    padding: theme.spacing(2, 2, 2, 0),
    gap: theme.spacing(2),
    display: "flex",
    flexFlow: "row",
  },
  content: {
    flex: 1,
    gap: theme.spacing(2),
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
}));

type MainView = "performance_overview" | "confusion_matrix" | "utterances";

const Exploration = () => {
  const classes = useStyles();
  const { jobId, datasetSplitName, mainView } = useParams<{
    jobId: string;
    datasetSplitName: DatasetSplitName;
    mainView: MainView;
  }>();
  const baseUrl = `/${jobId}/dataset_splits/${datasetSplitName}/${mainView}`;

  const {
    filters,
    pagination,
    pipeline,
    postprocessing,
    confusionMatrixState,
    searchString,
  } = useQueryState();

  const history = useHistory();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });
  const classOptions = datasetInfo?.classNames || [];

  const setMainView = (mainView: MainView) => {
    history.push(
      `/${jobId}/dataset_splits/${datasetSplitName}/${mainView}${searchString}`
    );
  };

  if (!isPipelineSelected(pipeline) && mainView !== "utterances") {
    setMainView("utterances");
  }

  return (
    <>
      <PageHeader />
      <div className={classes.container}>
        <div className={classes.layout}>
          <Controls
            filters={filters}
            pagination={pagination}
            pipeline={pipeline}
            postprocessing={postprocessing}
            searchString={searchString}
            confusionMatrixState={confusionMatrixState}
          />
          <div className={classes.content}>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: 4,
                paddingTop: 2.5,
              }}
            >
              <Box borderBottom={1} borderColor="divider">
                <Tabs
                  indicatorColor="secondary"
                  value={mainView}
                  onChange={(_, value) => setMainView(value)}
                >
                  <TabPipelineRequired
                    value="performance_overview"
                    label="Performance Overview"
                    pipeline={pipeline}
                  />
                  <TabPipelineRequired
                    value="confusion_matrix"
                    label="Confusion Matrix"
                    pipeline={pipeline}
                  />
                  <Tab value="utterances" label="Utterances Table" />
                </Tabs>
              </Box>
              {mainView === "performance_overview" &&
                isPipelineSelected(pipeline) && (
                  <>
                    <Metrics
                      jobId={jobId}
                      datasetSplitName={datasetSplitName}
                      filters={filters}
                      pipeline={pipeline}
                      postprocessing={postprocessing}
                    />
                    <ConfidenceHistogramTopWords
                      baseUrl={baseUrl}
                      filters={filters}
                      pagination={pagination}
                      pipeline={pipeline}
                      postprocessing={postprocessing}
                    />
                  </>
                )}
              {mainView === "confusion_matrix" &&
                isPipelineSelected(pipeline) && (
                  <ConfusionMatrix
                    jobId={jobId}
                    datasetSplitName={datasetSplitName}
                    filters={filters}
                    pipeline={pipeline}
                    classOptions={classOptions}
                    predictionFilters={filters.predictions}
                    labelFilters={filters.labels}
                    postprocessing={postprocessing}
                    confusionMatrixState={confusionMatrixState}
                  />
                )}
              {mainView === "utterances" && (
                <UtterancesTable
                  jobId={jobId}
                  datasetInfo={datasetInfo}
                  datasetSplitName={datasetSplitName}
                  pagination={pagination}
                  filters={filters}
                  pipeline={pipeline}
                  postprocessing={postprocessing}
                  confusionMatrixState={confusionMatrixState}
                />
              )}
            </Paper>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(Exploration);
