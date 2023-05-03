import { ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import DatasetSplitToggler from "components/Controls/DatasetSplitToggler";
import CopyButton from "components/CopyButton";
import Description from "components/Description";
import SmartTagFamilyBadge from "components/SmartTagFamilyBadge";
import Steps from "components/Steps";
import TabPipelineRequired from "components/TabPipelineRequired";
import PerturbedUtterances from "components/Utterance/PerturbedUtterances";
import SimilarUtterances from "components/Utterance/SimilarUtterances";
import UtteranceDataAction from "components/Utterance/UtteranceDataAction";
import UtteranceSaliency from "components/Utterance/UtteranceSaliency";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { Link } from "react-router-dom";
import {
  getConfigEndpoint,
  getDatasetInfoEndpoint,
  getSimilarUtterancesEndpoint,
} from "services/api";
import { DatasetSplitName, Utterance } from "types/api";
import { GetUtterancesQueryState } from "utils/api";
import {
  DATASET_SMART_TAG_FAMILIES,
  FADE_OUT_SCROLL_Y,
  ID_TOOLTIP,
  OUTCOME_COLOR,
  SMART_TAG_FAMILIES,
} from "utils/const";
import { camelToTitleCase, formatRatioAsPercentageString } from "utils/format";
import { getUtteranceIdTooltip } from "utils/getUtteranceIdTooltip";
import { isPipelineSelected } from "utils/helpers";
import NoMaxWidthTooltip from "./NoMaxWidthTooltip";

const UTTERANCE_DETAIL_TAB_DESCRIPTION = {
  similarity: (
    <Description
      text="Inspect the most similar utterances in the evaluation and training set, to see if they belong to the same base utterance class."
      link="user-guide/exploration-space/utterance-details/#semantically-similar-utterances"
    />
  ),
  perturbedUtterances: (
    <Description
      text="Shown here are the result of the perturbation tests that were automatically run to test the model's robustness to minor variations."
      link="user-guide/exploration-space/utterance-details/#behavioral-tests"
    />
  ),
};

const UtteranceDetails: React.FC<{
  jobId: string;
  index: number;
  datasetSplitName: DatasetSplitName;
  getUtterancesQueryState: GetUtterancesQueryState;
  utterance: Utterance;
  confidenceThreshold: number | null;
  arrows?: { toPrevious: string; toNext: string };
}> = ({
  jobId,
  index,
  datasetSplitName,
  getUtterancesQueryState,
  utterance,
  confidenceThreshold,
  arrows,
}) => {
  const { pipeline } = useQueryState();

  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const [view, setView] = React.useState<"perturbedUtterances" | "similarity">(
    "similarity"
  );

  if (!isPipelineSelected(pipeline) && view !== "similarity") {
    setView("similarity");
  }

  const [neighborsDatasetSplitName, setNeighborsDatasetSplitName] =
    React.useState<DatasetSplitName>(datasetSplitName);

  const { data: similarUtterances, isFetching: isFetchingSimilarUtterances } =
    getSimilarUtterancesEndpoint.useQuery(
      {
        jobId,
        datasetSplitName,
        index,
        neighborsDatasetSplitName,
        ...pipeline,
      },
      { skip: view !== "similarity" }
    );

  // Raw states will be capped to the number of steps later. This is necessary
  // when selecting a different pipeline with a different number of steps.
  const [preprocessingStepRaw, setPreprocessingStep] = React.useState(0);

  // Index from the right, so we can initialize to the last step
  // without the need for postprocessingSteps.length before it is loaded.
  const [postprocessingStepRaw, setPostprocessingStep] = React.useState(0);

  const refPrevious = React.useRef<HTMLAnchorElement>(null);
  const refNext = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    if (!arrows) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowLeft":
          arrows.toPrevious && refPrevious.current?.click();
          break;
        case "ArrowDown":
        case "ArrowRight":
          arrows.toNext && refNext.current?.click();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [arrows, refPrevious, refNext]);

  const { data: config } = getConfigEndpoint.useQuery({ jobId });

  // If config was undefined, PipelineCheck would not even render the page.
  if (config === undefined) return null;

  const smartTagFamilies = isPipelineSelected(pipeline)
    ? SMART_TAG_FAMILIES
    : DATASET_SMART_TAG_FAMILIES;

  const { modelPrediction } = utterance;

  const preprocessingSteps = [
    { className: "Initial", text: utterance.utterance },
    ...(modelPrediction?.preprocessingSteps ?? []),
  ];

  const postprocessingSteps = modelPrediction && [
    {
      className: "ModelOutput",
      output: {
        predictions: modelPrediction.modelPredictions,
        prediction: modelPrediction.modelPredictions[0],
        confidences: modelPrediction.modelConfidences,
        outcome: modelPrediction.modelOutcome,
      },
    },
    ...modelPrediction.postprocessingSteps,
  ];

  const preprocessingStep =
    preprocessingStepRaw < preprocessingSteps.length
      ? preprocessingStepRaw
      : preprocessingSteps.length - 1;

  const postprocessingStep =
    postprocessingSteps && postprocessingStepRaw < postprocessingSteps.length
      ? postprocessingSteps.length - 1 - postprocessingStepRaw
      : 0;

  const output = postprocessingSteps?.[postprocessingStep].output;

  return (
    <Box display="flex" flexDirection="column" gap={2} height="100%">
      <Description
        text="Inspect the details of all of the analyses that have been performed on this utterance."
        link="user-guide/exploration-space/utterance-details/"
      />
      <Paper
        variant="outlined"
        sx={{
          alignItems: "center",
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateColumns: `auto auto minmax(0, 2fr) ${
            isPipelineSelected(pipeline) ? "auto minmax(0, 1fr)" : ""
          }`,
          gridTemplateRows: "repeat(2, auto)",
          paddingY: 4,
          rowGap: 2,
          "& > *": {
            paddingX: 2,
          },
          "& > .header": {
            borderBottom: (theme) => `thin ${theme.palette.divider} solid`,
            height: "100%",
          },
        }}
      >
        <Box gridRow={2}>
          {arrows && (
            <NoMaxWidthTooltip
              title="Previous utterance in the list. You may also use the keyboard arrows."
              placement="bottom-start"
            >
              <IconButton
                component={Link}
                ref={refPrevious}
                disabled={arrows.toPrevious === ""}
                to={arrows.toPrevious}
              >
                <ArrowBackIosNew />
              </IconButton>
            </NoMaxWidthTooltip>
          )}
        </Box>
        <Tooltip title={ID_TOOLTIP}>
          <Typography variant="subtitle2" className="header">
            Id
          </Typography>
        </Tooltip>
        <Tooltip
          title={getUtteranceIdTooltip({
            utterance: utterance,
            persistentIdColumn: config.columns.persistentId,
          })}
        >
          <Typography variant="body2">{utterance.index}</Typography>
        </Tooltip>

        <Box className="header">
          <Typography variant="subtitle2">Utterance</Typography>
          {preprocessingSteps.length > 1 && (
            <Steps
              setStep={setPreprocessingStep}
              step={preprocessingStep}
              stepNames={preprocessingSteps.map(({ className }) =>
                camelToTitleCase(className)
              )}
              roundedStart
            />
          )}
        </Box>
        <Box display="flex">
          <Box maxHeight="13vh" {...FADE_OUT_SCROLL_Y}>
            <UtteranceSaliency
              tooltip
              utterance={preprocessingSteps[preprocessingStep].text}
              modelSaliency={
                preprocessingStep === 0 ? utterance.modelSaliency : null
              }
            />
          </Box>
          <CopyButton text={preprocessingSteps[preprocessingStep].text} />
        </Box>

        <Typography variant="subtitle2" className="header">
          Label
        </Typography>
        <Typography variant="body2">{utterance.label}</Typography>

        {output && (
          <>
            <Box className="header">
              <Typography variant="subtitle2">Prediction</Typography>
              {postprocessingSteps.length > 1 && (
                <Steps
                  setStep={(step) =>
                    setPostprocessingStep(postprocessingSteps.length - 1 - step)
                  }
                  step={postprocessingStep}
                  stepNames={postprocessingSteps.map(({ className }) =>
                    camelToTitleCase(className)
                  )}
                  roundedEnd
                />
              )}
            </Box>
            <Stack
              height={88}
              justifyContent="center"
              sx={{
                "& > p:first-of-type > span": {
                  color: (theme) =>
                    theme.palette[OUTCOME_COLOR[output.outcome]].main,
                  fontWeight: "bold",
                },
              }}
            >
              {output.prediction !== output.predictions[0] && (
                <Typography variant="body2">
                  <span>{output.prediction}</span>
                  {isPipelineSelected(pipeline) &&
                    confidenceThreshold !== null &&
                    ` (< ${formatRatioAsPercentageString(
                      confidenceThreshold
                    )})`}
                </Typography>
              )}
              {output.predictions.slice(0, 3).map((prediction, i) => (
                <Typography key={prediction} variant="body2">
                  <span>{prediction}</span> at{" "}
                  {formatRatioAsPercentageString(output.confidences[i])}
                </Typography>
              ))}
            </Stack>
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
            persistentIds={[utterance.persistentId]}
            dataAction={utterance.dataAction}
            allDataActions={datasetInfo?.dataActions || []}
            getUtterancesQueryState={getUtterancesQueryState}
          />
        </Box>
        <Box gridRow={2}>
          {arrows && (
            <NoMaxWidthTooltip
              title="Next utterance in the list. You may also use the keyboard arrows."
              placement="bottom-end"
            >
              <IconButton
                component={Link}
                ref={refNext}
                disabled={arrows.toNext === ""}
                to={arrows.toNext}
              >
                <ArrowForwardIos />
              </IconButton>
            </NoMaxWidthTooltip>
          )}
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
              persistentIdColumn={config.columns.persistentId}
              pipeline={pipeline}
              utterances={similarUtterances?.utterances || []}
              loading={isFetchingSimilarUtterances}
            />
          )}
          {view === "perturbedUtterances" && isPipelineSelected(pipeline) && (
            <PerturbedUtterances
              jobId={jobId}
              datasetSplitName={datasetSplitName}
              pipelineIndex={pipeline.pipelineIndex}
              index={utterance.index}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default React.memo(UtteranceDetails);
