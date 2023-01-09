import { Warning } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  formControlLabelClasses,
  FormGroup,
  formGroupClasses,
  FormHelperText,
  InputBaseComponentProps,
  inputClasses,
  inputLabelClasses,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccordionLayout from "components/AccordionLayout";
import _ from "lodash";
import React from "react";
import { useParams } from "react-router-dom";
import { getConfigEndpoint, updateConfigEndpoint } from "services/api";
import { AzimuthConfig, PipelineDefinition } from "types/api";
import { PickByValue } from "types/models";

const STEPPER: Record<string, InputBaseComponentProps> = {
  iterations: { min: 0 },
  high_epistemic_threshold: { min: 0, max: 1, step: 0.1 },
  conflicting_neighbors_threshold: { min: 0, max: 1, step: 0.1 },
  no_close_threshold: { min: 0, max: 1, step: 0.1 },
  min_num_per_class: { min: 0 },
  max_delta_class_imbalance: { min: 0, max: 1, step: 0.1 },
  max_delta_representation: { min: 0, max: 1, step: 0.01 },
  max_delta_mean_words: { min: 0, step: 0.1 },
  max_delta_std_words: { min: 0, step: 0.1 },
  short_sentence_max_word: { min: 0 },
  long_sentence_min_word: { min: 0 },
};

type SubConfigKeys = keyof PickByValue<AzimuthConfig, object>;

const CONFIG_SUB_FIELDS: Partial<AzimuthConfig> = {
  dataset_warnings: {
    max_delta_class_imbalance: 0,
    max_delta_mean_words: 0,
    max_delta_representation: 0,
    max_delta_std_words: 0,
    min_num_per_class: 0,
  },
  similarity: { conflicting_neighbors_threshold: 0, no_close_threshold: 0 },
  behavioral_testing: {},
};

const CUSTOM_METRICS: string[] = ["Accuracy", "Precision", "Recall", "F1"];
const ADDITIONAL_KWARGS_CUSTOM_METRICS = ["Precision", "Recall", "F1"];

const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof AzimuthConfig)[] = [
  "behavioral_testing",
  "similarity",
  "dataset_warnings",
  "syntax",
  "pipelines",
  "uncertainty",
  "metrics",
];

const ANALYSES_CUSTOMIZATION_IGNORE_FIELDS: string[] = [
  "spacy_model",
  "subj_tags",
  "obj_tags",
  "faiss_encoder",
];

const Columns: React.FC<{ columns?: number }> = ({ columns = 1, children }) => (
  <Box display="grid" gap={2} gridTemplateColumns={`repeat(${columns}, 1fr)`}>
    {children}
  </Box>
);

const KeyValuePairs: React.FC = ({ children }) => (
  <Box display="grid" gridTemplateColumns="max-content auto" columnGap={1}>
    {children}
  </Box>
);

const Settings: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const {
    data: config,
    isError,
    isFetching,
  } = getConfigEndpoint.useQuery({ jobId });
  const [updateConfig] = updateConfigEndpoint.useMutation();

  const [partialConfig, setPartialConfig] = React.useState<
    Partial<AzimuthConfig>
  >({});

  const resultingConfig = { ...config, ...partialConfig };

  const displaySectionTitle = (section: string) => (
    <Typography variant="subtitle2" marginY={1.5}>
      {section}
    </Typography>
  );

  const displayToggleSectionTitle = (
    field: keyof AzimuthConfig,
    section: string = field
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={Boolean(resultingConfig[field])}
          disabled={isError || isFetching}
          onChange={(...[, checked]) =>
            setPartialConfig({
              ...partialConfig,
              [field]: checked
                ? config![field] ?? CONFIG_SUB_FIELDS[field]
                : null,
            })
          }
        />
      }
      label={displaySectionTitle(section)}
      labelPlacement="start"
    />
  );

  const displayPostprocessorToggleSection = (
    pipelineIndex: number,
    pipeline: PipelineDefinition
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={Boolean(pipeline.postprocessors)}
          disabled={isError || isFetching}
          onChange={(...[, checked]) =>
            setPartialConfig({
              ...partialConfig,
              pipelines: [
                // TODO refactor pipelineIndex if we want to support adding or removing pipelines
                ...resultingConfig.pipelines!.slice(0, pipelineIndex),
                {
                  ...pipeline,
                  postprocessors: checked
                    ? config!.pipelines![pipelineIndex].postprocessors ?? []
                    : null,
                },
                ...resultingConfig.pipelines!.slice(pipelineIndex + 1),
              ],
            })
          }
        />
      }
      label={displaySectionTitle("Postprocessors")}
      labelPlacement="start"
    />
  );

  const displayArgumentsList = (
    name: string,
    argEntries: Record<string, any> | any[]
  ) => (
    <Box display="grid">
      <Typography variant="caption">{name}</Typography>
      <KeyValuePairs>
        {Object.entries(argEntries).map(([field, value], index) => (
          <React.Fragment key={index}>
            <Typography variant="body2">{field}:</Typography>
            <Tooltip title={value}>
              <Typography
                variant="body2"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {value}
              </Typography>
            </Tooltip>
          </React.Fragment>
        ))}
      </KeyValuePairs>
    </Box>
  );

  const displayReadonlyFields = (label: string, value: string | undefined) => (
    <TextField
      size="small"
      variant="standard"
      label={label}
      value={value}
      disabled={isError || isFetching}
      InputProps={{
        readOnly: true,
        disableUnderline: true,
      }}
      inputProps={{ sx: { textOverflow: "ellipsis" } }}
    />
  );

  const displayNumberField = (
    config: SubConfigKeys,
    field: string,
    value: number | undefined
  ) => (
    <TextField
      size="small"
      label={field}
      type="number"
      className="number"
      value={value}
      inputProps={STEPPER[field]}
      disabled={!resultingConfig[config]}
      variant="standard"
      onChange={(event) =>
        setPartialConfig({
          ...partialConfig,
          [config]: {
            ...resultingConfig[config],
            [field]: Number(event.target.value),
          },
        })
      }
    />
  );

  const displayPostprocessorNumberField = (
    pipelineIndex: number,
    pipeline: PipelineDefinition,
    field: string,
    postprocessorIdx: number,
    value: number | undefined
  ) => (
    <TextField
      size="small"
      label={field}
      type="number"
      className="number"
      value={value}
      inputProps={{
        min: 0,
        max: 1,
        step: 0.1,
      }}
      variant="standard"
      onChange={(event) =>
        setPartialConfig({
          ...partialConfig,
          pipelines: [
            ...resultingConfig.pipelines!.slice(0, pipelineIndex),
            {
              ...pipeline,
              postprocessors: [
                ...pipeline.postprocessors!.slice(0, postprocessorIdx),
                {
                  ...pipeline.postprocessors![postprocessorIdx],
                  [field]: Number(event.target.value),
                  kwargs: { [field]: Number(event.target.value) },
                },
                ...pipeline.postprocessors!.slice(postprocessorIdx + 1),
              ],
            },
            ...resultingConfig.pipelines!.slice(pipelineIndex + 1),
          ],
        })
      }
    />
  );

  const handleCustomMetricUpdate = (checked: boolean, metricName: string) => {
    checked
      ? setPartialConfig({
          ...partialConfig,
          metrics: {
            ...resultingConfig.metrics,
            [metricName]: {
              class_name: "datasets.load_metric",
              kwargs: {
                path: metricName.toLowerCase(),
              },
              additional_kwargs: ADDITIONAL_KWARGS_CUSTOM_METRICS.includes(
                metricName
              )
                ? { average: "weighted" }
                : {},
            },
          },
        })
      : setPartialConfig({
          ...partialConfig,
          metrics: _.omit(resultingConfig.metrics, metricName),
        });
  };

  const getProjectConfigSection = () => (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={3}>
          {resultingConfig.name &&
            displayReadonlyFields("name", resultingConfig.name)}
          {resultingConfig.rejection_class &&
            displayReadonlyFields(
              "rejection_class",
              resultingConfig.rejection_class
            )}
          {resultingConfig.columns && (
            <Box display="flex" flexDirection="column">
              <Typography variant="caption">columns</Typography>
              <KeyValuePairs>
                {resultingConfig.columns.text_input && (
                  <>
                    <Typography variant="body2">text_input:</Typography>
                    <Typography variant="body2">
                      {resultingConfig.columns.text_input}
                    </Typography>
                  </>
                )}
                {resultingConfig.columns.label && (
                  <>
                    <Typography variant="body2">label:</Typography>
                    <Typography variant="body2">
                      {resultingConfig.columns.label}
                    </Typography>
                  </>
                )}
              </KeyValuePairs>
            </Box>
          )}
        </Columns>
      </FormGroup>
      {displaySectionTitle("Dataset")}
      <FormGroup>
        <Columns columns={3}>
          {displayReadonlyFields(
            "class_name",
            resultingConfig.dataset?.class_name
          )}
          {resultingConfig.dataset?.remote &&
            displayReadonlyFields("remote", resultingConfig.dataset.remote)}
          {resultingConfig.dataset?.kwargs &&
            Object.keys(resultingConfig.dataset?.kwargs).length > 0 &&
            displayArgumentsList("kwargs", resultingConfig.dataset.kwargs)}
          {resultingConfig.dataset?.args &&
            resultingConfig.dataset.args.length > 0 &&
            displayArgumentsList("args", resultingConfig.dataset.args)}
        </Columns>
      </FormGroup>
    </>
  );
  const getModelContractConfigSection = () => (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={3}>
          {resultingConfig.model_contract &&
            displayReadonlyFields(
              "model_contract",
              resultingConfig.model_contract
            )}
          {resultingConfig.saliency_layer &&
            displayReadonlyFields(
              "saliency_layer",
              resultingConfig.saliency_layer
            )}
          {resultingConfig.uncertainty && (
            <Box display="flex" flexDirection="column">
              <Typography variant="caption">uncertainty</Typography>
              <KeyValuePairs>
                {Object.entries(resultingConfig.uncertainty).map(
                  ([field, value], index) => (
                    <React.Fragment key={index}>
                      <Typography variant="body2">{field}:</Typography>
                      <TextField
                        size="small"
                        type="number"
                        className="number"
                        value={value}
                        disabled={!resultingConfig.uncertainty}
                        inputProps={STEPPER[field]}
                        variant="standard"
                        onChange={(event) =>
                          setPartialConfig({
                            ...partialConfig,
                            uncertainty: {
                              ...resultingConfig.uncertainty,
                              [field]: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </React.Fragment>
                  )
                )}
              </KeyValuePairs>
            </Box>
          )}
        </Columns>
      </FormGroup>
      {resultingConfig.pipelines && displaySectionTitle("Pipelines")}
      <FormGroup sx={{ gap: 2 }}>
        {resultingConfig.pipelines?.map((pipeline, pipelineIndex) => (
          <Paper
            key={pipelineIndex}
            variant="outlined"
            sx={{ display: "flex", flexDirection: "column", paddingX: 2 }}
          >
            <FormControl>
              {displaySectionTitle("General")}
              <FormGroup>
                <Columns columns={3}>
                  {displayReadonlyFields("name", pipeline.name)}
                </Columns>
              </FormGroup>
            </FormControl>
            <FormControl>
              {displaySectionTitle("Model")}
              <FormGroup>
                <Columns columns={3}>
                  {displayReadonlyFields(
                    "class_name",
                    pipeline.model.class_name
                  )}
                  {pipeline.model.remote &&
                    displayReadonlyFields("remote", pipeline.model.remote)}
                  {pipeline.model.kwargs &&
                    Object.keys(pipeline.model.kwargs).length > 0 &&
                    displayArgumentsList("kwargs", pipeline.model.kwargs)}
                  {pipeline.model.args &&
                    pipeline.model.args.length > 0 &&
                    displayArgumentsList("args", pipeline.model.args)}
                </Columns>
              </FormGroup>
            </FormControl>
            <FormControl>
              {pipeline.postprocessors &&
                displayPostprocessorToggleSection(pipelineIndex, pipeline)}
              <FormGroup sx={{ gap: 2 }}>
                {pipeline.postprocessors?.map((postprocessor, index) => (
                  <Paper key={index} variant="outlined" sx={{ padding: 2 }}>
                    <Columns columns={3}>
                      {postprocessor.class_name &&
                        displayReadonlyFields(
                          "class_name",
                          postprocessor.class_name
                        )}
                      {postprocessor.temperature !== undefined &&
                        displayPostprocessorNumberField(
                          pipelineIndex,
                          pipeline,
                          "temperature",
                          index,
                          postprocessor.temperature
                        )}
                      {postprocessor.threshold !== undefined &&
                        displayPostprocessorNumberField(
                          pipelineIndex,
                          pipeline,
                          "threshold",
                          index,
                          postprocessor.threshold
                        )}
                    </Columns>
                  </Paper>
                ))}
              </FormGroup>
            </FormControl>
          </Paper>
        ))}
      </FormGroup>
      {displaySectionTitle("Metrics")}
      <FormGroup>
        {CUSTOM_METRICS.map((metricName, index) => (
          <FormControlLabel
            key={index}
            control={
              <Checkbox
                size="small"
                checked={Boolean(resultingConfig.metrics?.[metricName])}
                onChange={(e) =>
                  handleCustomMetricUpdate(e.target.checked, metricName)
                }
              />
            }
            label={<Typography variant="body2">{metricName}</Typography>}
          />
        ))}
      </FormGroup>
    </>
  );

  const getAnalysesCustomization = (config: SubConfigKeys) => (
    <FormGroup>
      <Columns columns={5}>
        {Object.entries(
          resultingConfig[config] ?? CONFIG_SUB_FIELDS[config] ?? {}
        ).map(
          ([field, value]) =>
            !ANALYSES_CUSTOMIZATION_IGNORE_FIELDS.includes(field) && (
              <React.Fragment key={field}>
                {displayNumberField(config, field, value)}
              </React.Fragment>
            )
        )}
      </Columns>
    </FormGroup>
  );

  const getAnalysesCustomizationSection = () => (
    <>
      {displaySectionTitle("Dataset Warnings")}
      {getAnalysesCustomization("dataset_warnings")}
      {displaySectionTitle("Syntax")}
      {getAnalysesCustomization("syntax")}
      {displayToggleSectionTitle("similarity", "Similarity")}
      {getAnalysesCustomization("similarity")}
      {displayToggleSectionTitle("behavioral_testing", "Perturbation Testing")}
    </>
  );

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          padding: 2,
          overflow: "auto",
          [`& .${formControlLabelClasses.labelPlacementStart}`]: {
            justifyContent: "flex-end",
            marginLeft: 0,
          },
          [`& .${formGroupClasses.root}`]: { marginX: 2, marginBottom: 2 },
          [`& .number .${inputClasses.root}`]: { width: "8ch" },
          [`& .${inputClasses.input}`]: { fontSize: 14, padding: 0 },
          [`& .${inputLabelClasses.root}`]: { fontWeight: "bold" },
        }}
      >
        <Typography variant="subtitle1" marginBottom={3}>
          View and edit certain fields from your config file. Once your changes
          are saved, expect some delays for recomputing the affected tasks.
        </Typography>
        <AccordionLayout
          name="Project Configuration"
          description="View the fields that define the dataset to load in Azimuth."
          link="reference/configuration/project/"
        >
          {getProjectConfigSection()}
        </AccordionLayout>
        <AccordionLayout
          name="Model Contract Configuration"
          description="View and edit some fields that define the ML pipelines and the metrics."
          link="reference/configuration/model_contract/"
        >
          {getModelContractConfigSection()}
        </AccordionLayout>
        <AccordionLayout
          name="Analyses Customization"
          description="Enable or disable some analyses and edit corresponding thresholds."
          link="reference/configuration/analyses/"
        >
          {getAnalysesCustomizationSection()}
        </AccordionLayout>
      </Paper>
      <Box display="flex" justifyContent="space-between" paddingY={2}>
        <Button variant="contained" onClick={() => setPartialConfig({})}>
          Discard
        </Button>
        <Box display="flex" alignItems="center" gap={2}>
          {FIELDS_TRIGGERING_STARTUP_TASKS.some((f) => partialConfig[f]) && (
            <>
              <Warning color="warning" />
              <FormHelperText>
                These changes may trigger some time-consuming computations.
                <br />
                Azimuth will not be usable until they complete.
              </FormHelperText>
            </>
          )}
          <Button
            variant="contained"
            onClick={() => updateConfig({ jobId, body: partialConfig })}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(Settings);
