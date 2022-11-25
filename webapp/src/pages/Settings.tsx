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
import AccordianLayout from "components/AccordianLayout";
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

type section = {
  name: string;
  description: string;
  docURL: string;
};

const configSection: section[] = [
  {
    name: "Project Config",
    description:
      "Contains mandatory fields that specify the dataset to load in Azimuth",
    docURL: "reference/configuration/project/",
  },
  {
    name: "Model Contract Config",
    description:
      "Defines how Azimuth interacts with the ML pipelines and the metrics",
    docURL: "reference/configuration/model_contract/",
  },
  {
    name: "Analyses Customization",
    description: "Four analyses configured in Azimuth",
    docURL: "reference/configuration/analyses/",
  },
];

const ANALYSES_CUSTOMIZATION: (keyof AzimuthConfig)[] = [
  "dataset_warnings",
  "syntax",
  "similarity",
];

const CUSTOM_METRICS: string[] = ["Accuracy", "Precision", "Recall", "F1"];

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

  const divider = <Divider sx={{ margin: 1 }} />;

  const displaySectionTitle = (section: string) => (
    <Box sx={{ m: 1, width: "20ch" }}>
      <Typography textTransform="capitalize" variant="caption" fontSize={16}>
        {section}
      </Typography>
    </Box>
  );

  const displaySubSectionTitle = (section: string) => (
    <Box sx={{ m: 1, width: "20ch" }}>
      <Typography textTransform="capitalize" variant="caption" fontSize={14}>
        {section}
      </Typography>
    </Box>
  );

  const displayToggleSectionTitle = (
    config: keyof AzimuthConfig,
    section: string = config
  ) => (
    <Box sx={{ m: 1, width: "20ch" }}>
      {switchNullOrDefault(config, Boolean(resultingConfig[config]))}
      <Typography textTransform="capitalize" variant="caption" fontSize={15}>
        {section}
      </Typography>
    </Box>
  );

  const displayPostprocessorToggleSection = (pipeline: PipelineDefinition) => (
    <Box sx={{ m: 1, width: "20ch" }}>
      <Checkbox
        sx={{ paddingLeft: 0 }}
        size="small"
        checked={Boolean(pipeline.postprocessors)}
        disabled={isError || isFetching}
        onChange={(event) => {
          const existedPipeline = partialConfig.pipelines
            ? partialConfig.pipelines.find(({ name }) => name === pipeline.name)
            : undefined;
          const updatedPipeline = [
            {
              ...pipeline,
              postprocessors: event.target.checked ? [] : null,
            },
          ];
          existedPipeline
            ? setPartialConfig({
                ...partialConfig,
                pipelines: _.unionBy(
                  updatedPipeline,
                  partialConfig.pipelines,
                  "name"
                ),
              })
            : setPartialConfig({
                ...partialConfig,
                pipelines: _.unionBy(
                  updatedPipeline,
                  resultingConfig?.pipelines,
                  "name"
                ),
              });
        }}
      />
      <Typography textTransform="capitalize" variant="caption" fontSize={15}>
        Postprocessors
      </Typography>
    </Box>
  );

  const switchNullOrDefault = (
    field: keyof AzimuthConfig,
    selected: boolean
  ) => (
    <Checkbox
      sx={{ paddingLeft: 0 }}
      checked={selected}
      disabled={isError || isFetching}
      onChange={(_, checked) =>
        setPartialConfig({ ...partialConfig, [field]: checked ? {} : null })
      }
    />
  );

  const displayReadonlyFields = (label: string, value: string | undefined) => (
    <TextField
      key={String(value)}
      sx={{
        m: 1,
        width: "32ch",
      }}
      size="small"
      variant="standard"
      label={<Typography fontWeight="bold">{label}</Typography>}
      value={value}
      disabled={isError || isFetching}
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
      key={field}
      sx={{ m: 1, width: "16ch" }}
      size="small"
      label={field}
      type="number"
      defaultValue={value}
      disabled={!Boolean(resultingConfig[config])}
      inputProps={STEPPER[field]}
      InputProps={{ style: { fontSize: 14 } }}
      variant="standard"
      onChange={(event) =>
        setPartialConfig(
          _.merge(partialConfig, {
            [config]: { [field]: Number(event.target.value) },
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
      key={field}
      sx={{ m: 1, width: "16ch" }}
      size="small"
      label={field}
      type="number"
      InputLabelProps={{
        shrink: true,
      }}
      defaultValue={value}
      inputProps={{ min: 0, max: 1, step: 0.1 }}
      variant="standard"
      onChange={(event) => {
        const existedPipeline = partialConfig.pipelines
          ? partialConfig.pipelines.find(({ name }) => name === pipeline.name)
          : undefined;
        const current_postprocessor = pipeline?.postprocessors?.find(
          (_, index) => index === postprocessorIdx
        );
        const updatedPostprocessor = _.merge({}, current_postprocessor, {
          [field]: Number(event.target.value),
        });
        const updatedPipeline = [
          {
            ...pipeline,
            postprocessors: _.unionBy(
              [updatedPostprocessor],
              pipeline.postprocessors,
              "class_name"
            ),
          },
        ];
        existedPipeline
          ? setPartialConfig({
              ...partialConfig,
              pipelines: _.unionBy(
                updatedPipeline,
                partialConfig.pipelines,
                "name"
              ),
            })
          : setPartialConfig({
              ...partialConfig,
              pipelines: _.unionBy(
                updatedPipeline,
                resultingConfig?.pipelines,
                "name"
              ),
            });
      }}
    />
  );

  const handleCustomMetricUpdate = (checked: boolean, metricName: string) => {
    checked
      ? setPartialConfig({
          ...partialConfig,
          ...{
            metrics: _.merge({}, resultingConfig?.metrics, {
              [metricName]: {
                class_name: "datasets.load_metric",
                kwargs: {
                  path: metricName.toLowerCase(),
                },
              },
            }),
          },
        })
      : setPartialConfig({
          ...partialConfig,
          ...{
            metrics: _.omit(resultingConfig?.metrics, metricName),
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
        {displayReadonlyFields("name", resultingConfig?.name)}
        {displayReadonlyFields(
          "rejection class",
          resultingConfig?.rejection_class
        )}
      </Box>
      <Box display="flex" flexDirection="row" marginLeft={2}>
        {displaySubSectionTitle("Columns")}
        {resultingConfig?.columns &&
          Object.entries(resultingConfig.columns).map(
            ([field, value], index) => (
              <Box key={index} gap={(theme) => theme.spacing(1)}>
                {displayReadonlyFields(field, value)}
              </Box>
            )
          )}
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
          resultingConfig?.dataset?.class_name
        )}
        {displayReadonlyFields("remote", resultingConfig?.dataset?.remote)}
      </Box>
      {resultingConfig?.dataset?.kwargs && (
        <Box display="flex" flexDirection="row" marginLeft={2} gap={5}>
          {displaySubSectionTitle("Kwargs")}
          {Object.entries(resultingConfig?.dataset?.kwargs).map(
            ([field, value], index) => (
              <Box key={index} gap={(theme) => theme.spacing(1)}>
                {displayReadonlyFields(field, String(value))}
              </Box>
            )
          )}
        </Box>
      )}
      {resultingConfig?.dataset?.args &&
        resultingConfig?.dataset?.args.length > 0 && (
          <Box display="flex" flexDirection="row" marginLeft={2} gap={5}>
            {displaySubSectionTitle("args")}
            {Object.entries(resultingConfig?.dataset?.args).map(
              ([field, value], index) => (
                <Box key={index} gap={(theme) => theme.spacing(1)}>
                  {displayReadonlyFields(field, String(value))}
                </Box>
              )
            )}
          </Box>
        )}
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
          resultingConfig?.model_contract
        )}
        {displayReadonlyFields(
          "saliency layer",
          resultingConfig?.saliency_layer
        )}
      </Box>
      {divider}
      <Box display="flex" flexDirection="row" marginLeft={2}>
        {displaySubSectionTitle("uncertainty")}
        {resultingConfig?.uncertainty &&
          Object.entries(resultingConfig.uncertainty).map(
            ([field, value], index) =>
              field !== "faiss_encoder" && (
                <Box
                  key={index}
                  display="flex"
                  flexDirection="row"
                  justifyContent="flex-start"
                  gap={5}
                >
                  {displaySubFields("uncertainty", field, value)}
                </Box>
              )
          )}
      </Box>
      {divider}
      {displaySectionTitle("Pipelines")}
      {resultingConfig?.pipelines &&
        resultingConfig.pipelines.map(
          ({ name, model, postprocessors }, index) => (
            <Box
              key={index}
              display="flex"
              flexDirection="column"
              gap={1}
              marginLeft={2}
              border="1px solid rgba(0, 0, 0, 0.12)"
            >
              {displaySectionTitle(name)}
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-start"
                gap={5}
                marginLeft={2}
              >
                {displaySubSectionTitle("Model")}
                {displayReadonlyFields("Class name", model.class_name)}
                {displayReadonlyFields("Remote", model.remote)}
              </Box>
              {model.kwargs && (
                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="flex-start"
                  gap={5}
                  marginLeft={2}
                >
                  {displaySubSectionTitle("kwargs")}
                  {Object.entries(model.kwargs).map(([key, value], index) => (
                    <Box key={index}>
                      {displayReadonlyFields(key, String(value))}
                    </Box>
                  ))}
                </Box>
              )}
              {model.args && model.args.length > 0 && (
                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="flex-start"
                  gap={5}
                  marginLeft={2}
                >
                  {displaySubSectionTitle("args")}
                  {Object.entries(model.args).map(([key, value], index) => (
                    <Box key={index}>
                      {displayReadonlyFields(key, String(value))}
                    </Box>
                  ))}
                </Box>
              )}
              <Box
                display="flex"
                flexDirection="column"
                marginLeft={2}
                marginBottom={2}
              >
                {displayPostprocessorToggleSection({
                  name,
                  model,
                  postprocessors,
                })}
                <Box
                  key={index}
                  display="flex"
                  flexDirection="column"
                  gap={1}
                  marginLeft={2}
                >
                  {postprocessors &&
                    postprocessors.map((postprocessor, index) => (
                      <Box
                        key={index}
                        display="flex"
                        flexDirection="row"
                        justifyContent="flex-start"
                        gap={5}
                        marginX={2}
                        padding={1}
                        border="1px solid rgba(0, 0, 0, 0.12)"
                      >
                        {displayReadonlyFields(
                          "class name",
                          postprocessor.class_name
                        )}
                        {postprocessor?.temperature &&
                          displayPostprocessorSubField(
                            { name, model, postprocessors },
                            "temperature",
                            index,
                            postprocessor?.temperature
                          )}
                        {postprocessor?.threshold &&
                          displayPostprocessorSubField(
                            { name, model, postprocessors },
                            "threshold",
                            index,
                            postprocessor?.threshold
                          )}
                      </Box>
                    ))}
                </Box>
              </Box>
            </Box>
          )
        )}
      {divider}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        gap={1}
      >
        {displaySectionTitle("metrics")}
        {CUSTOM_METRICS.map((metricName, index) => (
          <Box key={index} display="flex">
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(resultingConfig.metrics?.[metricName])}
                  color="primary"
                  onChange={(e) =>
                    handleCustomMetricUpdate(e.target.checked, metricName)
                  }
                />
              }
              label={metricName}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );

  const getAnalysesCustomization = () => (
    <Box display="flex" flexDirection="column" gap={2}>
      {ANALYSES_CUSTOMIZATION.map((customizationConfig, index) => (
        <Box key={index} display="flex" flexDirection="column" gap={1}>
          <Box display="flex" flexDirection="row" gap={2}>
            {customizationConfig === "similarity"
              ? displayToggleSectionTitle(
                  customizationConfig,
                  customizationConfig
                )
              : displaySectionTitle(customizationConfig)}
            {Object.entries(resultingConfig?.[customizationConfig] ?? {}).map(
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
      ))}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="flex-start"
        gap={5}
      >
        {displayToggleSectionTitle(
          "behavioral_testing",
          "Perturbation Testing"
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100%" }}>
      <Paper
        variant="outlined"
        sx={{ height: "85%", padding: 2, overflow: "auto" }}
      >
        <Typography variant="subtitle1">
          View and edit certain fields from your config file. Once your changes
          are saved, expect some delays for recomputing the affected tasks.
        </Typography>
        {configSection.map((section, index) => (
          <AccordianLayout key={index} {...section}>
            {index === 0 && getProjectConfigSection()}
            {index === 1 && getModalContractConfigSection()}
            {index === 2 && getAnalysesCustomization()}
          </AccordianLayout>
        ))}
      </Paper>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingY: 2,
        }}
      >
        <Button
          variant="contained"
          onClick={() => setPartialConfig({ ...data })}
        >
          Discard
        </Button>
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Button
            variant="contained"
            onClick={() => updateConfig({ jobId, body: partialConfig })}
          >
            Apply
          </Button>
          {FIELDS_TRIGGERING_STARTUP_TASKS.some((f) => partialConfig[f]) && (
            <FormHelperText error sx={{ textAlign: "center" }}>
              Warning!
              <br />
              These changes may trigger some time-consuming computations.
              <br />
              Azimuth will not be usable until they complete.
            </FormHelperText>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(Settings);
