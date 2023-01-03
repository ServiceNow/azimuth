import { Warning } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormHelperText,
  InputBaseComponentProps,
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
  iterations: { min: 0, max: 100, step: 1 },
  high_epistemic_threshold: { min: 0, max: 1, step: 0.1 },
  conflicting_neighbors_threshold: { min: 0, max: 1, step: 0.1 },
  no_close_threshold: { min: 0, max: 1, step: 0.1 },
  min_num_per_class: { min: 0, max: 100, step: 10 },
  max_delta_class_imbalance: { min: 0, max: 1, step: 0.1 },
  max_delta_representation: { min: 0, max: 0.1, step: 0.01 },
  max_delta_mean_tokens: { min: 0.0, max: 10.0, step: 1.0 },
  max_delta_std_tokens: { min: 0.0, max: 10.0, step: 1.0 },
  short_sentence_max_token: { min: 0, max: 100, step: 1 },
  long_sentence_min_token: { min: 0, max: 100, step: 1 },
};

type SubConfigKeys = keyof PickByValue<AzimuthConfig, object>;

const ANALYSES_CUSTOMIZATION: SubConfigKeys[] = [
  "dataset_warnings",
  "syntax",
  "similarity",
  "behavioral_testing",
];

const CONFIG_SUB_FIELDS: Partial<AzimuthConfig> = {
  dataset_warnings: {
    max_delta_class_imbalance: 0,
    max_delta_mean_tokens: 0,
    max_delta_representation: 0,
    max_delta_std_tokens: 0,
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

  const divider = <Divider sx={{ marginY: 1 }} />;

  const displaySectionTitle = (section: string) => (
    <Box sx={{ m: 1, width: "100px" }}>
      <Typography textTransform="capitalize" variant="subtitle2">
        {section}
      </Typography>
    </Box>
  );

  const displayToggleSectionTitle = (
    field: keyof AzimuthConfig,
    section: string = field
  ) => (
    <Box display="flex" flexDirection="row" marginLeft={1.5}>
      <Typography textTransform="capitalize" variant="subtitle2">
        {section}
      </Typography>
      <Checkbox
        sx={{ paddingTop: 0.5 }}
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
    </Box>
  );

  const displayPostprocessorToggleSection = (
    pipelineIndex: number,
    pipeline: PipelineDefinition
  ) => (
    <Box display="flex" flexDirection="row" padding={1}>
      <Typography variant="subtitle2">Postprocessors</Typography>
      <Checkbox
        size="small"
        sx={{ paddingTop: 0.5 }}
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
    </Box>
  );

  const displayArgumentsList = (
    name: string,
    argEntries: Record<string, any> | any[]
  ) => (
    <Box display="flex" flexDirection="column" paddingTop={1}>
      <Typography variant="caption">{name}</Typography>
      {Object.entries(argEntries).map(([field, value], index) => (
        <Box
          key={index}
          display="flex"
          flexDirection="row"
          justifyContent="flex-start"
        >
          <Typography
            variant="body2"
            sx={{
              width: "100%",
            }}
          >
            {field}:
          </Typography>
          <Tooltip title={value} placement="bottom">
            <Typography
              variant="body2"
              sx={{
                s: 1,
                width: "20ch",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {value}
            </Typography>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );

  const displayReadonlyFields = (label: string, value: string | undefined) => (
    <TextField
      sx={{ m: 1, width: "40ch" }}
      size="small"
      variant="standard"
      label={<Typography fontWeight="bold">{label}</Typography>}
      value={value}
      disabled={isError || isFetching}
      InputProps={{
        readOnly: true,
        disableUnderline: true,
      }}
      inputProps={{
        style: { fontSize: 14 },
      }}
    />
  );

  const displayNumberField = (
    config: SubConfigKeys,
    field: string,
    value: number | undefined
  ) => (
    <TextField
      id={field}
      size="small"
      label={<Typography fontWeight="bold">{field}</Typography>}
      type="number"
      value={value}
      inputProps={{
        ...STEPPER[field],
        style: { fontSize: 14 },
      }}
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
      key={postprocessorIdx}
      sx={{
        width: "15ch",
      }}
      size="small"
      label={<Typography fontWeight="bold">{field}</Typography>}
      type="number"
      value={value}
      inputProps={{
        min: 0,
        max: 1,
        step: 0.1,
        style: { fontSize: 14 },
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
    <Box display="flex" flexDirection="column" justifyContent="flex-start">
      {displaySectionTitle("general")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        marginLeft={2}
        gap={5}
      >
        {displayReadonlyFields("name", resultingConfig.name)}
        {displayReadonlyFields(
          "rejection_class",
          resultingConfig.rejection_class
        )}
        <Box display="flex" flexDirection="column" paddingTop={1}>
          <Typography variant="caption">columns</Typography>
          <Box display="flex" flexDirection="row">
            <Typography
              sx={{
                width: "100px",
              }}
              variant="body2"
            >
              text_input:
            </Typography>
            <Typography variant="body2">
              {resultingConfig.columns?.text_input}
            </Typography>
          </Box>
          <Box display="flex" flexDirection="row">
            <Typography
              sx={{
                width: "100px",
              }}
              variant="body2"
            >
              label:
            </Typography>
            <Typography variant="body2">
              {resultingConfig.columns?.label}
            </Typography>
          </Box>
        </Box>
      </Box>
      {divider}
      {displaySectionTitle("dataset")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        alignContent="start"
        flexWrap="wrap"
        gap={(theme) => theme.spacing(1, 5)}
        marginLeft={2}
      >
        {displayReadonlyFields(
          "class_name",
          resultingConfig.dataset?.class_name
        )}
        {displayReadonlyFields("remote", resultingConfig.dataset?.remote)}
        {resultingConfig.dataset?.kwargs &&
          displayArgumentsList("kwargs", resultingConfig.dataset.kwargs)}
        {resultingConfig.dataset?.args &&
          resultingConfig.dataset.args.length > 0 &&
          displayArgumentsList("args", resultingConfig.dataset.args)}
      </Box>
    </Box>
  );
  const getModelContractConfigSection = () => (
    <Box display="flex" flexDirection="column" justifyContent="flex-start">
      {displaySectionTitle("general")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        marginLeft={2}
        gap={5}
      >
        {displayReadonlyFields(
          "model_contract",
          resultingConfig.model_contract
        )}
        {displayReadonlyFields(
          "saliency_layer",
          resultingConfig.saliency_layer
        )}
        <Box display="flex" flexDirection="column" paddingTop={1}>
          <Typography variant="caption">uncertainty</Typography>
          {resultingConfig.uncertainty &&
            Object.entries(resultingConfig.uncertainty).map(
              ([field, value], index) => (
                <Box key={index} display="flex" flexDirection="row">
                  <Typography
                    sx={{
                      width: "20ch",
                      whiteSpace: "normal",
                    }}
                    variant="body2"
                  >
                    {field}:
                  </Typography>
                  <TextField
                    id={field}
                    sx={{ width: "5ch" }}
                    size="small"
                    type="number"
                    value={value}
                    disabled={!resultingConfig.uncertainty}
                    inputProps={{
                      ...STEPPER[field],
                      style: { fontSize: 14 },
                    }}
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
                </Box>
              )
            )}
        </Box>
      </Box>
      {divider}
      <Box sx={{ m: 1, width: "100px", marginTop: 1 }}>
        <Typography variant="body1" fontWeight="bold">
          Pipelines
        </Typography>
      </Box>
      {resultingConfig.pipelines &&
        resultingConfig.pipelines.map(
          ({ name, model, postprocessors }, pipelineIndex) => (
            <Paper
              key={pipelineIndex}
              variant="outlined"
              component={Box}
              display="flex"
              flexDirection="column"
              margin={2}
              padding={1}
            >
              {displaySectionTitle("general")}
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-start"
                marginLeft={2}
              >
                {displayReadonlyFields("name", name)}
              </Box>
              {displaySectionTitle("model")}
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-start"
                alignContent="center"
                flexWrap="wrap"
                gap={(theme) => theme.spacing(1, 5)}
                marginLeft={2}
              >
                {displayReadonlyFields("class_name", model.class_name)}
                {displayReadonlyFields("remote", model.remote)}
                {model.kwargs && displayArgumentsList("kwargs", model.kwargs)}
                {model.args &&
                  model.args.length > 0 &&
                  displayArgumentsList("args", model.args)}
              </Box>
              {displayPostprocessorToggleSection(pipelineIndex, {
                name,
                model,
                postprocessors,
              })}
              <Box
                key={pipelineIndex}
                display="flex"
                flexDirection="column"
                gap={1}
                margin={2}
              >
                {postprocessors?.map((postprocessor, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    component={Box}
                    display="flex"
                    flexDirection="row"
                    justifyContent="flex-start"
                    gap={2}
                    padding={1}
                    marginX={2}
                  >
                    {displayReadonlyFields(
                      "class_name",
                      postprocessor.class_name
                    )}
                    {postprocessor.temperature !== undefined &&
                      displayPostprocessorNumberField(
                        pipelineIndex,
                        { name, model, postprocessors },
                        "temperature",
                        index,
                        postprocessor.temperature
                      )}
                    {postprocessor.threshold !== undefined &&
                      displayPostprocessorNumberField(
                        pipelineIndex,
                        { name, model, postprocessors },
                        "threshold",
                        index,
                        postprocessor.threshold
                      )}
                  </Paper>
                ))}
              </Box>
            </Paper>
          )
        )}
      <Box display="flex" flexDirection="column" justifyContent="flex-start">
        {displaySectionTitle("metrics")}
        {CUSTOM_METRICS.map((metricName, index) => (
          <FormControlLabel
            key={index}
            sx={{ marginLeft: 2 }}
            control={
              <Checkbox
                size="small"
                checked={Boolean(resultingConfig.metrics?.[metricName])}
                color="primary"
                onChange={(e) =>
                  handleCustomMetricUpdate(e.target.checked, metricName)
                }
              />
            }
            label={<Typography variant="body2">{metricName}</Typography>}
          />
        ))}
      </Box>
    </Box>
  );

  const getAnalysesCustomization = () =>
    ANALYSES_CUSTOMIZATION.map((customizationConfig, index) => (
      <Box
        key={index}
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        gap={5}
      >
        {customizationConfig === "behavioral_testing" ? (
          displayToggleSectionTitle(
            "behavioral_testing",
            "Perturbation Testing"
          )
        ) : (
          <Box key={index} display="flex" flexDirection="column">
            {customizationConfig === "similarity"
              ? displayToggleSectionTitle(
                  customizationConfig,
                  customizationConfig
                )
              : displaySectionTitle(customizationConfig)}
            <Box
              display="flex"
              flexDirection="row"
              gap={5}
              sx={{
                "& .MuiTextField-root": { m: 1, width: "18ch" },
              }}
            >
              {Object.entries(
                resultingConfig[customizationConfig] ??
                  CONFIG_SUB_FIELDS[customizationConfig] ??
                  {}
              ).map(
                ([field, value], index) =>
                  !ANALYSES_CUSTOMIZATION_IGNORE_FIELDS.includes(field) && (
                    <Box
                      key={index}
                      display="flex"
                      flexDirection="row"
                      justifyContent="flex-start"
                      marginLeft={2}
                      gap={5}
                    >
                      {displayNumberField(customizationConfig, field, value)}
                    </Box>
                  )
              )}
            </Box>
            {divider}
          </Box>
        )}
      </Box>
    ));

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Paper
        variant="outlined"
        component={Box}
        flex={1}
        padding={2}
        overflow="auto"
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
          {getAnalysesCustomization()}
        </AccordionLayout>
      </Paper>
      <Box display="flex" justifyContent="space-between" paddingY={2}>
        <Button variant="contained" onClick={() => setPartialConfig({})}>
          Discard
        </Button>
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          gap={2}
        >
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
