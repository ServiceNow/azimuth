import { Box, Paper, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import noData from "assets/void.svg";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import CopyButton from "components/CopyButton";
import Description from "components/Description";
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
import { DatasetSplitName } from "types/api";
import {
  DATASET_SMART_TAG_FAMILIES,
  ID_TOOLTIP,
  OUTCOME_COLOR,
  SMART_TAG_FAMILIES,
} from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import { isPipelineSelected } from "utils/helpers";

const UTTERANCE_DETAIL_TAB_DESCRIPTION = {
  similarity: (
    <Description
      text="Inspect the most similar utterances in the evaluation and training set, to see if they belong to the same base utterance class."
      link="/exploration-space/utterance-details/#semantically-similar-utterances"
    />
  ),
  perturbedUtterances: (
    <Description
      text="Shown here are the result of the perturbation tests that were automatically run to test the model's robustness to minor variations."
      link="/exploration-space/utterance-details/#behavioral-tests"
    />
  ),
};

export const UtteranceDetail = () => {
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

  const { modelPrediction } = utterance;

  return (
    <Box display="flex" flexDirection="column" gap={2} height="100%">
      <Description
        text="Inspect the details of all of the analyses that have been performed on this utterance."
        link="/exploration-space/utterance-details/"
      />
      <Paper
        variant="outlined"
        sx={{
          alignItems: "center",
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateColumns: `auto 1fr`,
          gridTemplateRows: "repeat(2, auto)",
          paddingX: 4,
          paddingY: 2,
          "& > *": {
            padding: 2,
          },
          "& > .header": {
            borderBottom: (theme) => `thin ${theme.palette.divider} solid`,
          },
        }}
      >
        <Tooltip title={ID_TOOLTIP}>
          <Typography variant="subtitle2" className="header">
            Id
          </Typography>
        </Tooltip>
        <Typography variant="body2">{utteranceId}</Typography>

        <Typography variant="subtitle2" className="header">
          Utterance
        </Typography>
        <Box display="flex" alignItems="center">
          <UtteranceSaliency
            variant="subtitle1"
            tooltip
            utterance={utterance}
          />
          <CopyButton text={utterance.utterance} />
        </Box>

        <Typography variant="subtitle2" className="header">
          Label
        </Typography>
        <Typography variant="body2">{utterance.label}</Typography>

        {modelPrediction && (
          <>
            <Typography variant="subtitle2" className="header">
              Prediction
            </Typography>
            <Box
              sx={{
                "& > p:first-of-type > span": {
                  color: (theme) =>
                    theme.palette[
                      OUTCOME_COLOR[modelPrediction.postprocessedOutcome]
                    ].main,
                  fontWeight: "bold",
                },
              }}
            >
              {modelPrediction.postprocessedPrediction !==
                modelPrediction.modelPredictions[0] && (
                <Typography variant="body2">
                  <span>{modelPrediction.postprocessedPrediction}</span>
                  {isPipelineSelected(pipeline) &&
                    utterancesResponse?.confidenceThreshold !== null &&
                    ` (< ${formatRatioAsPercentageString(
                      utterancesResponse.confidenceThreshold
                    )})`}
                </Typography>
              )}
              {modelPrediction.modelPredictions
                .slice(0, 3)
                .map((prediction, i) => (
                  <Typography key={prediction} variant="body2">
                    <span>{prediction}</span> at{" "}
                    {formatRatioAsPercentageString(
                      modelPrediction.postprocessedConfidences[i]
                    )}
                  </Typography>
                ))}
            </Box>
          </>
        )}

        <Typography variant="subtitle2" className="header">
          Smart Tags
        </Typography>
        <Box display="grid" gap={1} gridTemplateColumns="auto auto">
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

        <Typography variant="subtitle2" className="header">
          Proposed Action
        </Typography>
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
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
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
        {UTTERANCE_DETAIL_TAB_DESCRIPTION[view]}
        {view === "similarity" && (
          <Box width={280}>
            <DatasetSplitToggler
              availableDatasetSplits={datasetInfo?.availableDatasetSplits}
              value={neighborsDatasetSplitName}
              onChange={(value) => value && setNeighborsDatasetSplitName(value)}
            />
          </Box>
        )}
        <Box flex={1}>
          {view === "similarity" && (
            <SimilarUtterances
              baseUrl={`/${jobId}/dataset_splits/${neighborsDatasetSplitName}/utterances`}
              baseUtterance={utterance}
              pipeline={pipeline}
              utterances={similarUtterances?.utterances || []}
            />
          )}
          {view === "perturbedUtterances" && isPipelineSelected(pipeline) && (
            <PerturbedUtterances
              jobId={jobId}
              datasetSplitName={datasetSplitName}
              pipelineIndex={pipeline.pipelineIndex}
              index={Number(utteranceId)}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default UtteranceDetail;
