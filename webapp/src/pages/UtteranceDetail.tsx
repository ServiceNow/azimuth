import {
  Box,
  Paper,
  Tab,
  Tabs,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import noData from "assets/void.svg";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import CopyButton from "components/CopyButton";
import { Description } from "components/Description";
import Loading from "components/Loading";
import SmartTagFamilyBadge from "components/SmartTagFamilyBadge";
import TabPipelineRequired from "components/TabPipelineRequired";
import PerturbedUtterances from "components/Utterance/PerturbedUtterances";
import SimilarUtterances from "components/Utterance/SimilarUtterances";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import UtteranceSaliency from "components/Utterance/UtteranceSaliency";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useParams } from "react-router-dom";
import {
  getDatasetInfoEndpoint,
  getSimilarUtterancesEndpoint,
  getUtterancesEndpoint,
} from "services/api";
import { DatasetSplitName, Outcome } from "types/api";
import {
  DATASET_SMART_TAG_FAMILIES,
  ID_TOOLTIP,
  OUTCOME_COLOR,
  SMART_TAG_FAMILIES,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { isPipelineSelected } from "utils/helpers";

const useStyles = makeStyles<Theme, { outcome?: Outcome }>((theme) => ({
  tags: {
    display: "grid",
    gridTemplateColumns: "auto auto",
    gridTemplateRows: theme.spacing(3),
    gap: theme.spacing(1),
  },
  tabContent: {
    flex: 1,
  },
  utteranceContainer: {
    alignItems: "center",
    display: "grid",
    gridAutoFlow: "column",
    gridTemplateColumns: `auto 1fr`,
    gridTemplateRows: "repeat(2, auto)",
    padding: theme.spacing(2, 4),
    "& > *": {
      padding: theme.spacing(2),
    },
    "& > *:nth-child(odd)": {
      borderBottom: `thin ${theme.palette.divider} solid`,
      fontWeight: "bold",
    },
  },
  testsAndSimilarity: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  prediction: {
    "&:first-child > span": {
      color: ({ outcome }) =>
        outcome && theme.palette[OUTCOME_COLOR[outcome]].main,
      fontWeight: "bold",
    },
  },
}));

const UtteranceDetail = () => {
  const { jobId, utteranceId, datasetSplitName } = useParams<{
    jobId: string;
    utteranceId: string;
    datasetSplitName: DatasetSplitName;
  }>();
  const index = Number(utteranceId);
  const { pipeline } = useQueryState();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const [view, setView] = React.useState<"perturbedUtterances" | "similarity">(
    "similarity"
  );

  if (!isPipelineSelected(pipeline) && view !== "similarity") {
    setView("similarity");
  }

  const getUtterancesQueryState = {
    jobId,
    datasetSplitName,
    indices: [index],
    ...pipeline,
  };

  const { data: utterancesResponse, isFetching: utteranceIsFetching } =
    getUtterancesEndpoint.useQuery(getUtterancesQueryState);

  const utterance = utterancesResponse?.utterances[0];

  const [neighborsDatasetSplitName, setNeighborsDatasetSplitName] =
    React.useState<DatasetSplitName>(datasetSplitName);

  const { data: similarUtterances } = getSimilarUtterancesEndpoint.useQuery(
    {
      jobId,
      datasetSplitName,
      index,
      neighborsDatasetSplitName,
      ...pipeline,
    },
    { skip: view !== "similarity" }
  );

  const classes = useStyles({
    outcome: utterance?.modelPrediction?.postprocessedOutcome,
  });

  if (!utterance) {
    // utterance will be defined while utteranceIsFetching after changing the
    // dataAction tag, in which case we want to render the utterance.
    if (utteranceIsFetching) {
      return <Loading />;
    }

    return (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} height="100%" width="50%" alt="Utterance not found" />
        <Typography variant="h3">Utterance not found.</Typography>
      </Box>
    );
  }

  const smartTagFamilies = isPipelineSelected(pipeline)
    ? SMART_TAG_FAMILIES
    : DATASET_SMART_TAG_FAMILIES;

  return (
    <Box display="flex" flexDirection="column" gap={2} height="100%">
      <Paper variant="outlined" className={classes.utteranceContainer}>
        <Tooltip title={ID_TOOLTIP}>
          <Typography>Id</Typography>
        </Tooltip>
        <Typography variant="body2">{utteranceId}</Typography>

        <Typography>Utterance</Typography>
        <Box display="flex" alignItems="center">
          <UtteranceSaliency
            variant="subtitle1"
            tooltip
            utterance={utterance}
          />
          <CopyButton text={utterance.utterance} />
        </Box>

        <Typography>Label</Typography>
        <Typography variant="body2">{utterance.label}</Typography>

        {utterance.modelPrediction && (
          <>
            <Typography>Prediction</Typography>
            <Box>
              {utterance.modelPrediction.postprocessedPrediction !==
                utterance.modelPrediction.modelPredictions[0] && (
                <Typography variant="body2" className={classes.prediction}>
                  <span>
                    {utterance.modelPrediction.postprocessedPrediction}
                  </span>
                  {isPipelineSelected(pipeline) &&
                    utterancesResponse?.confidenceThreshold !== null &&
                    ` (< ${formatRatioAsPercentageString(
                      utterancesResponse.confidenceThreshold
                    )})`}
                </Typography>
              )}
              {utterance.modelPrediction.modelPredictions
                .slice(0, 3)
                .map((prediction, i) => (
                  <Typography
                    key={prediction}
                    variant="body2"
                    className={classes.prediction}
                  >
                    <span>{prediction}</span> at{" "}
                    {formatRatioAsPercentageString(
                      utterance.modelPrediction?.postprocessedConfidences[
                        i
                      ] as number
                    )}
                  </Typography>
                ))}
            </Box>
          </>
        )}

        <Typography>Smart Tags</Typography>
        <Box className={classes.tags}>
          {smartTagFamilies.map(
            (family) =>
              utterance[family].length > 0 && (
                <SmartTagFamilyBadge
                  key={family}
                  family={family}
                  smartTags={utterance[family]}
                  withName
                />
              )
          )}
        </Box>

        <Typography>Proposed Action</Typography>
        <Box>
          <UtteranceDataAction
            utteranceIds={[index]}
            dataAction={utterance.dataAction}
            allDataActions={datasetInfo?.dataActions || []}
            getUtterancesQueryState={getUtterancesQueryState}
          />
        </Box>
      </Paper>
      <Paper
        variant="outlined"
        className={classes.testsAndSimilarity}
        sx={{
          gap: 4,
          padding: 4,
          paddingTop: 2.5,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          borderBottom={1}
          borderColor="divider"
        >
          <Tabs
            indicatorColor="secondary"
            value={view}
            onChange={(_, value) => setView(value)}
          >
            <Tab value="similarity" label="Semantically Similar Utterances" />
            <TabPipelineRequired
              value="perturbedUtterances"
              label="Behavioral Tests"
              pipeline={pipeline}
            />
          </Tabs>
        </Box>
        {view === "similarity" && (
          <Box width={280}>
            <DatasetSplitToggler
              value={neighborsDatasetSplitName}
              onChange={(value) => value && setNeighborsDatasetSplitName(value)}
            />
          </Box>
        )}
        <div className={classes.tabContent}>
          {view === "similarity" && (
            <>
              <Box paddingBottom={2}>
                <Description
                  text="Here are shown the 10 most similar utterances in the dataset as calculated using sentence embeddings. Use the toggle button to alternate whether to search for similar utterances in the evaluation set or in the training set. "
                  link="/exploration-space/utterance-details/#semantically-similar-utterances"
                />
              </Box>
              <SimilarUtterances
                baseUrl={`/${jobId}/dataset_splits/${neighborsDatasetSplitName}/utterances`}
                baseUtterance={utterance}
                pipeline={pipeline}
                utterances={similarUtterances?.utterances || []}
              />
            </>
          )}
          {view === "perturbedUtterances" && isPipelineSelected(pipeline) && (
            <>
              <Box paddingBottom={2}>
                <Description
                  text="Shown here are the result of the perturbation tests that were automatically run to test the model's robustness to minor variations. "
                  link="/exploration-space/utterance-details/#behavioral-tests"
                />
              </Box>
              <PerturbedUtterances
                jobId={jobId}
                datasetSplitName={datasetSplitName}
                pipelineIndex={pipeline.pipelineIndex}
                index={Number(utteranceId)}
              />
            </>
          )}
        </div>
      </Paper>
    </Box>
  );
};

export default UtteranceDetail;
