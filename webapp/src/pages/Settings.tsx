import { Warning } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  formControlLabelClasses,
  FormGroup,
  formGroupClasses,
  FormHelperText,
  InputAdornment,
  InputBaseComponentProps,
  inputClasses,
  InputLabel,
  inputLabelClasses,
  MenuItem,
  Paper,
  Select,
  TextField,
  TextFieldProps,
  Tooltip,
  Typography,
} from "@mui/material";
import noData from "assets/void.svg";
import AccordionLayout from "components/AccordionLayout";
import Loading from "components/Loading";
import _ from "lodash";
import React from "react";
import { useParams } from "react-router-dom";
import {
  getConfigEndpoint,
  getDefaultConfigEndpoint,
  updateConfigEndpoint,
} from "services/api";
import {
  AzimuthConfig,
  PipelineDefinition,
  SupportedLanguage,
} from "types/api";
import { PickByValue } from "types/models";
import { UNKNOWN_ERROR } from "utils/const";

const PERCENTAGE = { scale: 100, units: "%", inputProps: { min: 0, max: 100 } };
const INT = { inputProps: { min: 1 } };
const FLOAT = { inputProps: { min: 0, step: 0.1 } };
const COSINE_SIMILARITY = { inputProps: { min: -1, max: 1, step: 0.1 } };

const FIELDS: Record<
  string,
  { scale?: number; units?: string; inputProps: InputBaseComponentProps }
> = {
  iterations: INT,
  high_epistemic_threshold: FLOAT,
  conflicting_neighbors_threshold: PERCENTAGE,
  no_close_threshold: COSINE_SIMILARITY,
  min_num_per_class: { ...INT, units: "samples" },
  max_delta_class_imbalance: PERCENTAGE,
  max_delta_representation: PERCENTAGE,
  max_delta_mean_words: { ...FLOAT, units: "words" },
  max_delta_std_words: { ...FLOAT, units: "words" },
  short_utterance_max_word: { ...INT, units: "words" },
  long_utterance_min_word: { ...INT, units: "words" },
  temperature: FLOAT,
  threshold: PERCENTAGE,
};

type SubConfigKeys = keyof PickByValue<AzimuthConfig, object | null>;

const CUSTOM_METRICS: string[] = ["Accuracy", "Precision", "Recall", "F1"];
const ADDITIONAL_KWARGS_CUSTOM_METRICS = ["Precision", "Recall", "F1"];
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "fr"];
const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof AzimuthConfig)[] = [
  "behavioral_testing",
  "similarity",
  "dataset_warnings",
  "syntax",
  "pipelines",
  "uncertainty",
  "metrics",
];

const Columns: React.FC<{ columns?: number }> = ({ columns = 1, children }) => (
  <Box display="grid" gap={2} gridTemplateColumns={`repeat(${columns}, 1fr)`}>
    {children}
  </Box>
);

const displaySectionTitle = (section: string) => (
  <Typography variant="subtitle2" marginY={1.5}>
    {section}
  </Typography>
);

const KeyValuePairs: React.FC = ({ children }) => (
  <Box display="grid" gridTemplateColumns="max-content auto" columnGap={1}>
    {children}
  </Box>
);

const displayKeywordArguments = (name: string, kwargs: Record<string, any>) => (
  <Box key={name} display="flex" flexDirection="column">
    <Typography variant="caption">{name}</Typography>
    <KeyValuePairs>
      {Object.entries(kwargs).map(([field, value], index) => (
        <React.Fragment key={index}>
          <Typography variant="body2">{field}:</Typography>
          <Tooltip title={Array.isArray(value) ? value.join(", ") : value}>
            <Typography
              variant="body2"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {Array.isArray(value) ? value.join(", ") : value}
            </Typography>
          </Tooltip>
        </React.Fragment>
      ))}
    </KeyValuePairs>
  </Box>
);

const displayArgumentsList = (name: string, args: any[]) => (
  <Box key={name} display="flex" flexDirection="column">
    <Typography variant="caption">{name}</Typography>
    {args.map((value, index) => (
      <Typography
        key={index}
        variant="body2"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {value}
      </Typography>
    ))}
  </Box>
);

const displayReadonlyFields = (label: string, value: string | null) => (
  <TextField
    key={label}
    size="small"
    variant="standard"
    label={label}
    value={String(value)}
    InputProps={{
      readOnly: true,
      disableUnderline: true,
    }}
    inputProps={{
      sx: {
        textOverflow: "ellipsis",
        ...(value === null && { fontStyle: "italic" }),
      },
    }}
  />
);

const NumberField: React.FC<
  Omit<TextFieldProps, "onChange"> & {
    value: number;
    scale?: number;
    units?: string;
    onChange: (newValue: number) => void;
  }
> = ({ value, scale = 1, units, onChange, ...props }) => {
  // Control value with a `string` (and not with a `number`) so that for example
  // when hitting backspace at the end of `0.01`, you get `0.0` (and not `0`).
  const [stringValue, setStringValue] = React.useState(String(value * scale));

  React.useEffect(() => {
    if (value !== Number(stringValue) / scale) {
      setStringValue(String(value * scale));
    }
  }, [value, scale, stringValue]);

  return (
    <TextField
      variant="standard"
      size="small"
      type="number"
      className="fixedWidthInput"
      title="" // Overwrite any default input validation tooltip
      value={stringValue}
      {...(units && {
        InputProps: {
          endAdornment: <InputAdornment position="end">{units}</InputAdornment>,
        },
      })}
      onChange={(event) => {
        setStringValue(event.target.value);
        onChange(Number(event.target.value) / scale);
      }}
      {...props}
    />
  );
};

const Settings: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [language, setLanguage] = React.useState<
    SupportedLanguage | undefined
  >();
  const {
    data: defaultConfig,
    isLoading,
    error,
  } = getDefaultConfigEndpoint.useQuery({ jobId, language });
  const { data: config } = getConfigEndpoint.useQuery({ jobId });
  const [updateConfig, { isLoading: isUpdatingConfig }] =
    updateConfigEndpoint.useMutation();

  const [partialConfig, setPartialConfig] = React.useState<
    Partial<AzimuthConfig>
  >({});

  React.useEffect(() => {
    if (
      config &&
      defaultConfig &&
      defaultConfig.language !== resultingConfig.language
    ) {
      setPartialConfig({
        language: defaultConfig.language,
        syntax: {
          ...(partialConfig.syntax ?? config.syntax),
          spacy_model: defaultConfig.syntax.spacy_model,
          subj_tags: defaultConfig.syntax.subj_tags,
          obj_tags: defaultConfig.syntax.obj_tags,
        },
        similarity: {
          ...(partialConfig.similarity ??
            config.similarity ??
            defaultConfig.similarity!),
          faiss_encoder: defaultConfig.similarity!.faiss_encoder,
        },
        behavioral_testing: {
          ...(partialConfig.behavioral_testing ??
            config.behavioral_testing ??
            defaultConfig.behavioral_testing!),
          neutral_token: {
            ...(partialConfig.behavioral_testing?.neutral_token ??
              config.behavioral_testing?.neutral_token ??
              defaultConfig.behavioral_testing!.neutral_token),
            suffix_list:
              defaultConfig.behavioral_testing!.neutral_token.suffix_list,
            prefix_list:
              defaultConfig.behavioral_testing!.neutral_token.prefix_list,
          },
        },
      });
    }
  }, [defaultConfig]);

  // If config was undefined, PipelineCheck would not even render the page.
  if (config === undefined) return null;

  if (isLoading) {
    return <Loading />;
  } else if (error || defaultConfig === undefined) {
    return (
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="No default config data available" />
        <Typography>{error?.message || UNKNOWN_ERROR}</Typography>
      </Box>
    );
  }
  const resultingConfig = Object.assign({}, config, partialConfig);

  const displayToggleSectionTitle = (
    field: keyof AzimuthConfig,
    section: string = field
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={Boolean(resultingConfig[field])}
          onChange={(...[, checked]) =>
            setPartialConfig({
              ...partialConfig,
              [field]: checked ? config[field] ?? defaultConfig[field] : null,
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
          onChange={(...[, checked]) =>
            setPartialConfig({
              ...partialConfig,
              pipelines: [
                // TODO refactor pipelineIndex if we want to support adding or removing pipelines
                ...resultingConfig.pipelines!.slice(0, pipelineIndex),
                {
                  ...pipeline,
                  postprocessors: checked
                    ? config.pipelines![pipelineIndex].postprocessors ??
                      defaultConfig.pipelines![0].postprocessors
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

  const displayPostprocessorNumberField = (
    pipelineIndex: number,
    pipeline: PipelineDefinition,
    field: string,
    postprocessorIdx: number,
    value: number
  ) => (
    <NumberField
      label={field}
      value={value}
      disabled={!resultingConfig.pipelines![pipelineIndex].postprocessors}
      onChange={(newValue) =>
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
                  [field]: newValue,
                  kwargs: { [field]: newValue },
                },
                ...pipeline.postprocessors!.slice(postprocessorIdx + 1),
              ],
            },
            ...resultingConfig.pipelines!.slice(pipelineIndex + 1),
          ],
        })
      }
      {...FIELDS[field]}
    />
  );

  const handleCustomMetricUpdate = (checked: boolean, metricName: string) => {
    setPartialConfig({
      ...partialConfig,
      metrics: checked
        ? {
            ...resultingConfig.metrics,
            [metricName]: {
              class_name: "datasets.load_metric",
              args: [],
              kwargs: {
                path: metricName.toLowerCase(),
              },
              remote: null,
              additional_kwargs: ADDITIONAL_KWARGS_CUSTOM_METRICS.includes(
                metricName
              )
                ? { average: "weighted" }
                : {},
            },
          }
        : _.omit(resultingConfig.metrics, metricName),
    });
  };

  const getProjectConfigSection = () => (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={3}>
          {displayReadonlyFields("name", resultingConfig.name)}
          {displayReadonlyFields(
            "rejection_class",
            resultingConfig.rejection_class
          )}
          <Box display="flex" flexDirection="column">
            <Typography variant="caption">columns</Typography>
            <KeyValuePairs>
              <Typography variant="body2">text_input:</Typography>
              <Typography variant="body2">
                {resultingConfig.columns.text_input}
              </Typography>
              <Typography variant="body2">label:</Typography>
              <Typography variant="body2">
                {resultingConfig.columns.label}
              </Typography>
            </KeyValuePairs>
          </Box>
        </Columns>
      </FormGroup>
      {displaySectionTitle("Dataset")}
      <FormGroup>
        <Columns columns={3}>
          {displayReadonlyFields(
            "class_name",
            resultingConfig.dataset.class_name
          )}
          {displayReadonlyFields("remote", resultingConfig.dataset.remote)}
          {resultingConfig.dataset.args.length > 0 &&
            displayArgumentsList("args", resultingConfig.dataset.args)}
          {Object.keys(resultingConfig.dataset.kwargs).length > 0 &&
            displayKeywordArguments("kwargs", resultingConfig.dataset.kwargs)}
        </Columns>
      </FormGroup>
    </>
  );
  const getModelContractConfigSection = () => (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={3}>
          {displayReadonlyFields(
            "model_contract",
            resultingConfig.model_contract
          )}
          {displayReadonlyFields(
            "saliency_layer",
            resultingConfig.saliency_layer
          )}
          <Box display="flex" flexDirection="column">
            <Typography variant="caption">uncertainty</Typography>
            <KeyValuePairs>
              {Object.entries(resultingConfig.uncertainty).map(
                ([field, value], index) => (
                  <React.Fragment key={index}>
                    <Typography variant="body2">{field}:</Typography>
                    <NumberField
                      value={value}
                      disabled={!resultingConfig.uncertainty}
                      onChange={(newValue) =>
                        setPartialConfig({
                          ...partialConfig,
                          uncertainty: {
                            ...resultingConfig.uncertainty,
                            [field]: newValue,
                          },
                        })
                      }
                      {...FIELDS[field]}
                    />
                  </React.Fragment>
                )
              )}
            </KeyValuePairs>
          </Box>
        </Columns>
      </FormGroup>
      {resultingConfig.pipelines?.length && (
        <>
          {displaySectionTitle("Pipelines")}
          <FormGroup sx={{ gap: 2 }}>
            {resultingConfig.pipelines.map((pipeline, pipelineIndex) => (
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
                      {displayReadonlyFields("remote", pipeline.model.remote)}
                      {pipeline.model.args.length > 0 &&
                        displayArgumentsList("args", pipeline.model.args)}
                      {Object.keys(pipeline.model.kwargs).length > 0 &&
                        displayKeywordArguments(
                          "kwargs",
                          pipeline.model.kwargs
                        )}
                    </Columns>
                  </FormGroup>
                </FormControl>
                <FormControl>
                  {displayPostprocessorToggleSection(pipelineIndex, pipeline)}
                  <FormGroup sx={{ gap: 2 }}>
                    {(
                      pipeline.postprocessors ??
                      defaultConfig.pipelines![0].postprocessors
                    )?.map((postprocessor, index) => (
                      <Paper key={index} variant="outlined" sx={{ padding: 2 }}>
                        <Columns columns={3}>
                          {displayReadonlyFields(
                            "class_name",
                            postprocessor.class_name
                          )}
                          {"temperature" in postprocessor &&
                            displayPostprocessorNumberField(
                              pipelineIndex,
                              pipeline,
                              "temperature",
                              index,
                              postprocessor.temperature
                            )}
                          {"threshold" in postprocessor &&
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
        </>
      )}
      {displaySectionTitle("Metrics")}
      <FormGroup>
        {CUSTOM_METRICS.map((metricName, index) => (
          <FormControlLabel
            key={index}
            control={
              <Checkbox
                size="small"
                checked={Boolean(resultingConfig.metrics[metricName])}
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
          resultingConfig[config] ?? defaultConfig[config] ?? {}
        ).map(([field, value]) =>
          field in FIELDS ? (
            <NumberField
              key={field}
              label={field}
              value={value}
              disabled={!resultingConfig[config]}
              onChange={(newValue) =>
                setPartialConfig({
                  ...partialConfig,
                  [config]: { ...resultingConfig[config], [field]: newValue },
                })
              }
              {...FIELDS[field]}
            />
          ) : Array.isArray(value) ? (
            displayArgumentsList(field, value)
          ) : typeof value === "object" ? (
            displayKeywordArguments(field, value)
          ) : (
            displayReadonlyFields(field, value)
          )
        )}
      </Columns>
    </FormGroup>
  );

  const displayAnalysesCustomizationGeneralSection = () => (
    <FormGroup>
      <Box display="flex" gap={5} alignItems="center">
        <FormControl variant="standard" className="fixedWidthInput">
          <InputLabel id="language-input-label">language</InputLabel>
          <Select
            value={language ?? resultingConfig.language}
            labelId="language-input-label"
            onChange={(event) =>
              setLanguage(event.target.value as SupportedLanguage)
            }
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <MenuItem key={language} value={language}>
                {language}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box display="flex" flexDirection="row" gap={1}>
          <Warning color="warning" />
          <Typography variant="body2">
            Changing the language would impact the syntax, similarity and
            behavioral_testing sections
          </Typography>
        </Box>
      </Box>
    </FormGroup>
  );

  const getAnalysesCustomizationSection = () => (
    <>
      {displaySectionTitle("General")}
      {displayAnalysesCustomizationGeneralSection()}
      {displaySectionTitle("Dataset Warnings")}
      {getAnalysesCustomization("dataset_warnings")}
      {displaySectionTitle("Syntax")}
      {getAnalysesCustomization("syntax")}
      {displayToggleSectionTitle("similarity", "Similarity")}
      {getAnalysesCustomization("similarity")}
      {displayToggleSectionTitle("behavioral_testing", "Behavioral Testing")}
      {getAnalysesCustomization("behavioral_testing")}
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
          [`& .fixedWidthInput .${inputClasses.root}`]: { width: "12ch" },
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
        <Button
          variant="contained"
          onClick={() => {
            setPartialConfig({});
            setLanguage(undefined);
          }}
        >
          Discard
        </Button>

        <Box display="flex" alignItems="center" gap={2}>
          {isUpdatingConfig ? (
            <>
              <CircularProgress size={16} />
              <FormHelperText>
                Please wait while the config changes are validated.
              </FormHelperText>
            </>
          ) : (
            FIELDS_TRIGGERING_STARTUP_TASKS.some((f) => partialConfig[f]) && (
              <>
                <Warning color="warning" />
                <FormHelperText>
                  These changes may trigger some time-consuming computations.
                  <br />
                  Azimuth will not be usable until they complete.
                </FormHelperText>
              </>
            )
          )}
          <Button
            variant="contained"
            disabled={isUpdatingConfig}
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
