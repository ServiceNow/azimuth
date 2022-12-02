import { Info } from "@mui/icons-material";
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
  Typography,
} from "@mui/material";
import _ from "lodash";
import React from "react";
import AccordionLayout from "components/AccordionLayout";
import { useParams } from "react-router-dom";
import { getConfigEndpoint, updateConfigEndpoint } from "services/api";
import { AzimuthConfig, PipelineDefinition } from "types/api";

type stepper = { [key: string]: InputBaseComponentProps };
const STEPPER: stepper = {
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

const ANALYSES_CUSTOMIZATION: (keyof AzimuthConfig)[] = [
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

const Settings: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isError, isFetching } = getConfigEndpoint.useQuery({ jobId });
  const [updateConfig] = updateConfigEndpoint.useMutation();

  const [partialConfig, setPartialConfig] = React.useState<
    Partial<AzimuthConfig>
  >({});

  const resultingConfig = { ...data, ...partialConfig };

  const divider = <Divider sx={{ marginY: 1 }} />;

  const displaySectionTitle = (section: string) => (
    <Box sx={{ m: 1, width: "15ch" }}>
      <Typography textTransform="capitalize" variant="subtitle2">
        {section}
      </Typography>
    </Box>
  );

  const displayToggleSectionTitle = (
    config: keyof AzimuthConfig,
    section: string = config
  ) => (
    <Box display="flex" flexDirection="row" sx={{ m: 1, width: "20ch" }}>
      <Typography textTransform="capitalize" variant="body2">
        {section}
      </Typography>
      {switchNullOrDefault(config, Boolean(resultingConfig[config]))}
    </Box>
  );

  const displayPostprocessorToggleSection = (pipeline: PipelineDefinition) => (
    <Box display="flex" flexDirection="row" sx={{ m: 1, width: "20ch" }}>
      <Typography textTransform="capitalize" variant="subtitle2">
        Postprocessors
      </Typography>
      <Checkbox
        sx={{ paddingTop: 0 }}
        size="small"
        checked={Boolean(pipeline.postprocessors)}
        disabled={isError || isFetching}
        onChange={(event) => {
          setPartialConfig({
            ...partialConfig,
            pipelines: _.unionBy(
              [
                {
                  ...pipeline,
                  postprocessors: event.target.checked
                    ? _.find(data?.pipelines, ["name", pipeline.name])
                        ?.postprocessors
                    : null,
                },
              ],
              _.has(partialConfig, "pipelines")
                ? partialConfig.pipelines
                : resultingConfig.pipelines,
              "name"
            ),
          });
        }}
      />
    </Box>
  );

  const switchNullOrDefault = (
    field: keyof AzimuthConfig,
    selected: boolean
  ) => (
    <Checkbox
      sx={{ paddingTop: 0 }}
      size="small"
      checked={selected}
      disabled={isError || isFetching}
      onChange={(event) =>
        setPartialConfig({
          ...partialConfig,
          [field]: event.target.checked
            ? data?.[field] ?? CONFIG_SUB_FIELDS[field]
            : null,
        })
      }
    />
  );

  const displayReadonlyFields = (label: string, value: string | undefined) => (
    <TextField
      sx={{
        m: 1,
        width: "32ch",
      }}
      size="small"
      variant="standard"
      label={<Typography fontWeight="bold">{label}</Typography>}
      value={value}
      disabled={isError || isFetching}
      inputProps={{
        "data-testid": `${label}`,
      }}
      InputProps={{
        readOnly: true,
        disableUnderline: true,
        style: { textTransform: "capitalize", fontSize: 14 },
      }}
    />
  );

  const displaySubFields = (
    config: keyof AzimuthConfig,
    field: string,
    value: number | undefined
  ) => (
    <TextField
      id={field}
      sx={{ m: 1, width: "16ch" }}
      size="small"
      label={field}
      type="number"
      value={value}
      disabled={!Boolean(resultingConfig[config])}
      inputProps={(STEPPER[field], { "data-testid": `${field}` })}
      variant="standard"
      onChange={(event) =>
        setPartialConfig(
          _.merge({}, partialConfig, {
            [config]: _.merge(
              { [field]: Number(event.target.value) },
              config in partialConfig ? {} : _.get(resultingConfig, config)
            ),
          })
        )
      }
    />
  );

  const displayPostprocessorSubField = (
    pipeline: PipelineDefinition,
    field: string,
    postprocessorIdx: number,
    value: number | undefined
  ) => (
    <TextField
      key={postprocessorIdx}
      sx={{ m: 1, width: "16ch" }}
      size="small"
      label={field}
      type="number"
      InputLabelProps={{
        shrink: true,
      }}
      value={value}
      inputProps={{ min: 0, max: 1, step: 0.1, "data-testid": `${field}` }}
      variant="standard"
      onChange={(event) =>
        setPartialConfig({
          ...partialConfig,
          pipelines: _.unionBy(
            [
              {
                ...pipeline,
                postprocessors: _.unionBy(
                  [
                    _.merge({}, pipeline?.postprocessors?.[postprocessorIdx], {
                      [field]: Number(event.target.value),
                      kwargs: { [field]: Number(event.target.value) },
                    }),
                  ],
                  pipeline.postprocessors,
                  "class_name"
                ),
              },
            ],
            _.has(partialConfig, "pipelines")
              ? partialConfig.pipelines
              : resultingConfig.pipelines,
            "name"
          ),
        })
      }
    />
  );

  const handleCustomMetricUpdate = (checked: boolean, metricName: string) => {
    checked
      ? setPartialConfig({
          ...partialConfig,
          ...{
            metrics: _.merge({}, resultingConfig.metrics, {
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
            }),
          },
        })
      : setPartialConfig({
          ...partialConfig,
          ...{
            metrics: _.omit(resultingConfig.metrics, metricName),
          },
        });
  };

  const getProjectConfigSection = () => (
    <Box display="flex" flexDirection="column">
      {displaySectionTitle("General")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        marginLeft={2}
      >
        {displayReadonlyFields("name", resultingConfig.name)}
        {displayReadonlyFields(
          "rejection class",
          resultingConfig.rejection_class
        )}
        <Box display="flex" flexDirection="column">
          <Typography textTransform="capitalize" variant="caption">
            Columns
          </Typography>
          <Typography variant="body2">
            text_input: {resultingConfig.columns?.text_input}
          </Typography>
          <Typography variant="body2">
            label: {resultingConfig.columns?.label}
          </Typography>
        </Box>
      </Box>
      {divider}
      {displaySectionTitle("Dataset")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        marginLeft={2}
      >
        {displayReadonlyFields(
          "class name",
          resultingConfig.dataset?.class_name
        )}
        {displayReadonlyFields("remote", resultingConfig.dataset?.remote)}
        {resultingConfig.dataset?.kwargs && (
          <Box display="flex" flexDirection="column" marginLeft={1}>
            <Typography textTransform="capitalize" variant="caption">
              kwargs
            </Typography>
            {Object.entries(resultingConfig.dataset?.kwargs).map(
              ([field, value], index) => (
                <Box
                  key={index}
                  gap={(theme) => theme.spacing(1)}
                  marginLeft={1}
                >
                  <Typography variant="body2">
                    {field}: {value}
                  </Typography>
                </Box>
              )
            )}
          </Box>
        )}
        {resultingConfig.dataset?.args &&
          resultingConfig.dataset?.args.length > 0 && (
            <Box display="flex" flexDirection="column" marginLeft={1}>
              <Typography textTransform="capitalize" variant="caption">
                args
              </Typography>
              {Object.entries(resultingConfig.dataset?.args).map(
                ([field, value], index) => (
                  <Box
                    key={index}
                    gap={(theme) => theme.spacing(1)}
                    marginLeft={1}
                  >
                    <Typography variant="body2">
                      {field}: {value}
                    </Typography>
                  </Box>
                )
              )}
            </Box>
          )}
      </Box>
    </Box>
  );
  const getModalContractConfigSection = () => (
    <Box display="flex" flexDirection="column">
      {displaySectionTitle("General")}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        marginLeft={2}
      >
        {displayReadonlyFields(
          "model_contract",
          resultingConfig.model_contract
        )}
        {displayReadonlyFields(
          "saliency layer",
          resultingConfig.saliency_layer
        )}
        <Box display="flex" flexDirection="column" marginLeft={1}>
          <Typography textTransform="capitalize" variant="caption">
            Uncertainty
          </Typography>
          {resultingConfig.uncertainty &&
            _.sortBy(Object.entries(resultingConfig.uncertainty)).map(
              ([field, value], index) => (
                <Box
                  key={index}
                  display="flex"
                  flexDirection="row"
                  gap={(theme) => theme.spacing(0.5)}
                >
                  <Typography
                    textTransform="capitalize"
                    variant="body2"
                    marginTop={1}
                    sx={{
                      s: 1,
                      width: "20ch",
                    }}
                  >
                    {field}:
                  </Typography>
                  <TextField
                    id={field}
                    sx={{ s: 1, width: "5.5ch" }}
                    size="small"
                    type="number"
                    value={value}
                    disabled={!Boolean(resultingConfig.uncertainty)}
                    style={{ fontSize: 14 }}
                    inputProps={
                      (STEPPER[field],
                      { "data-testid": `${field}` },
                      { style: { fontSize: 14 } })
                    }
                    variant="standard"
                    onChange={(event) =>
                      setPartialConfig(
                        _.merge({}, partialConfig, {
                          uncertainty: _.merge(
                            { [field]: Number(event.target.value) },
                            _.has(partialConfig, "uncertainty")
                              ? {}
                              : _.get(resultingConfig, "uncertainty")
                          ),
                        })
                      )
                    }
                  />
                </Box>
              )
            )}
        </Box>
      </Box>
      {divider}
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
            label={metricName}
          />
        ))}
      </Box>
      {divider}
      {displaySectionTitle("Pipelines")}
      {resultingConfig.pipelines &&
        _.sortBy(resultingConfig.pipelines, "name").map(
          ({ name, model, postprocessors }, pipelineIndex) => (
            <>
              {displaySectionTitle(name)}
              <Box
                key={pipelineIndex}
                display="flex"
                flexDirection="column"
                gap={1}
                margin={1}
                border="1px solid rgba(0, 0, 0, 0.12)"
              >
                {displaySectionTitle("Model")}
                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="flex-start"
                  gap={5}
                  marginLeft={2}
                >
                  {displayReadonlyFields("Class name", model.class_name)}
                  {displayReadonlyFields("Remote", model.remote)}
                  {model.kwargs && (
                    <Box display="flex" flexDirection="column" marginLeft={1}>
                      <Typography textTransform="capitalize" variant="caption">
                        kwargs
                      </Typography>
                      {Object.entries(model.kwargs).map(
                        ([field, value], index) => (
                          <Box
                            key={index}
                            gap={(theme) => theme.spacing(1)}
                            marginLeft={1}
                          >
                            <Typography variant="body2">
                              {field}: {value}
                            </Typography>
                          </Box>
                        )
                      )}
                    </Box>
                  )}
                  {model.args && model.args.length > 0 && (
                    <Box display="flex" flexDirection="column" marginLeft={1}>
                      <Typography textTransform="capitalize" variant="caption">
                        args
                      </Typography>
                      {Object.entries(model.args).map(
                        ([field, value], index) => (
                          <Box
                            key={index}
                            gap={(theme) => theme.spacing(1)}
                            marginLeft={1}
                          >
                            <Typography variant="body2">
                              {field}: {value}
                            </Typography>
                          </Box>
                        )
                      )}
                    </Box>
                  )}
                </Box>
                <Box display="flex" flexDirection="column" marginBottom={2}>
                  {displayPostprocessorToggleSection({
                    name,
                    model,
                    postprocessors,
                  })}
                  <Box
                    key={pipelineIndex}
                    display="flex"
                    flexDirection="column"
                    gap={1}
                    marginLeft={2}
                  >
                    {postprocessors &&
                      _.sortBy(postprocessors, "class_name").map(
                        (postprocessor, index) => (
                          <Box
                            key={index}
                            display="flex"
                            flexDirection="row"
                            justifyContent="flex-start"
                            gap={5}
                            padding={1}
                            marginX={2}
                            border="1px solid rgba(0, 0, 0, 0.12)"
                          >
                            {displayReadonlyFields(
                              "class name",
                              postprocessor.class_name
                            )}
                            {postprocessor.temperature &&
                              displayPostprocessorSubField(
                                { name, model, postprocessors },
                                "temperature",
                                index,
                                postprocessor.temperature
                              )}
                            {postprocessor.threshold &&
                              displayPostprocessorSubField(
                                { name, model, postprocessors },
                                "threshold",
                                index,
                                postprocessor.threshold
                              )}
                          </Box>
                        )
                      )}
                  </Box>
                </Box>
              </Box>
            </>
          )
        )}
    </Box>
  );

  const getAnalysesCustomization = () =>
    ANALYSES_CUSTOMIZATION.map((customizationConfig, index) => (
      <Box key={index} display="flex" flexDirection="column" gap={1}>
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
            <Box display="flex" flexDirection="row" gap={2} marginLeft={2}>
              {_.sortBy(
                Object.entries(
                  resultingConfig[customizationConfig] ??
                    CONFIG_SUB_FIELDS[customizationConfig] ??
                    {}
                )
              ).map(
                ([field, value], index) =>
                  field !== "faiss_encoder" && (
                    <Box
                      key={index}
                      display="flex"
                      flexDirection="row"
                      justifyContent="flex-start"
                      gap={5}
                    >
                      {displaySubFields(customizationConfig, field, value)}
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
    <Box sx={{ height: "100%" }}>
      <Paper
        variant="outlined"
        sx={{ height: "90%", padding: 2, overflow: "auto" }}
      >
        <Typography variant="subtitle1" marginBottom={3}>
          View and edit certain fields from your config file. Once your changes
          are saved, expect some delays for recomputing the affected tasks.
        </Typography>
        <AccordionLayout
          name="Project Config"
          description="Contains mandatory fields that specify the dataset to load in Azimuth"
          link="reference/configuration/project/"
        >
          {getProjectConfigSection()}
        </AccordionLayout>
        <AccordionLayout
          name="Model Contract Config"
          description="Defines how Azimuth interacts with the ML pipelines and the metrics"
          link="reference/configuration/model_contract/"
        >
          {getModalContractConfigSection()}
        </AccordionLayout>
        <AccordionLayout
          name="Analyses Customization"
          description="Four analyses configured in Azimuth"
          link="reference/configuration/analyses/"
        >
          {getAnalysesCustomization()}
        </AccordionLayout>
      </Paper>
      <Box
        sx={{
          height: "10%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingY: 2,
        }}
      >
        <Button variant="contained" onClick={() => setPartialConfig({})}>
          Discard
        </Button>
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          gap={1}
        >
          {FIELDS_TRIGGERING_STARTUP_TASKS.some((f) => partialConfig[f]) && (
            <FormHelperText
              sx={{
                color: (theme) => theme.palette.warning.main,
              }}
            >
              <Info
                color="primary"
                fontSize="small"
                sx={{
                  marginRight: 0.5,
                }}
              />
              Warning!. These changes may trigger some time-consuming
              computations.
              <br />
              Azimuth will not be usable until they complete.
            </FormHelperText>
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
