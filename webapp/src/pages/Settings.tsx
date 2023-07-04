import {
  ArrowDropDown,
  Close,
  Download,
  History,
  Upload,
  Warning,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  formControlLabelClasses,
  FormGroup,
  formGroupClasses,
  FormHelperText,
  IconButton,
  InputBaseComponentProps,
  inputClasses,
  inputLabelClasses,
  Menu,
  MenuItem,
  Theme,
  Typography,
} from "@mui/material";
import noData from "assets/void.svg";
import AccordionLayout from "components/AccordionLayout";
import FileInputButton from "components/FileInputButton";
import HashChip from "components/HashChip";
import Loading from "components/Loading";
import AutocompleteStringField from "components/Settings/AutocompleteStringField";
import CustomObjectFields from "components/Settings/CustomObjectFields";
import EditableArray from "components/Settings/EditableArray";
import JSONField from "components/Settings/JSONField";
import NumberField from "components/Settings/NumberField";
import StringArrayField from "components/Settings/StringArrayField";
import StringField from "components/Settings/StringField";
import { splicedArray } from "components/Settings/utils";
import React from "react";
import { useParams } from "react-router-dom";
import {
  getConfigEndpoint,
  getConfigHistoryEndpoint,
  getDefaultConfigEndpoint,
  updateConfigEndpoint,
  validateConfigEndpoint,
} from "services/api";
import {
  AzimuthConfig,
  MetricDefinition,
  PipelineDefinition,
  SupportedLanguage,
  SupportedModelContract,
  SupportedSpacyModels,
  TemperatureScaling,
  ThresholdConfig,
} from "types/api";
import { PickByValue } from "types/models";
import { downloadBlob } from "utils/api";
import { UNKNOWN_ERROR } from "utils/const";
import { formatDateISO } from "utils/format";
import { raiseErrorToast } from "utils/helpers";

type MetricState = MetricDefinition & { name: string };

type ConfigState = Omit<AzimuthConfig, "metrics"> & { metrics: MetricState[] };

const azimuthConfigToConfigState = ({
  metrics,
  ...rest
}: AzimuthConfig): ConfigState => ({
  ...rest,
  metrics: Object.entries(metrics).map(([name, m]) => ({ name, ...m })),
});

const configStateToAzimuthConfig = ({
  metrics,
  ...rest
}: Partial<ConfigState>): Partial<AzimuthConfig> => ({
  ...rest,
  ...(metrics && {
    metrics: Object.fromEntries(metrics.map(({ name, ...m }) => [name, m])),
  }),
});

const CONFIG_UPDATE_MESSAGE =
  "Please wait while the config changes are validated.";
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
  threshold: PERCENTAGE,
  nb_typos_per_utterance: INT,
  seed: INT,
};

type SubConfigKeys = keyof PickByValue<
  ConfigState,
  { [key: string]: unknown } | null
>;

const COLUMNS = ["text_input", "label", "persistent_id"] as const;
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "fr"];
const SUPPORTED_MODEL_CONTRACTS: SupportedModelContract[] = [
  "hf_text_classification",
  "file_based_text_classification",
  "custom_text_classification",
];
const SUPPORTED_SPACY_MODELS: SupportedSpacyModels[] = [
  "en_core_web_sm",
  "fr_core_news_md",
];
const USE_CUDA_OPTIONS = ["auto", "true", "false"] as const;
type UseCUDAOption = typeof USE_CUDA_OPTIONS[number];

const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof ConfigState)[] = [
  "dataset",
  "columns",
  "rejection_class",
  "behavioral_testing",
  "similarity",
  "dataset_warnings",
  "syntax",
  "model_contract",
  "pipelines",
  "uncertainty",
  "saliency_layer",
  "metrics",
  "language",
];

type KnownPostprocessor = TemperatureScaling | ThresholdConfig;

const KNOWN_POSTPROCESSORS: {
  [T in KnownPostprocessor as T["class_name"]]: Partial<T>;
} = {
  "azimuth.utils.ml.postprocessing.TemperatureScaling": { temperature: 1 },
  "azimuth.utils.ml.postprocessing.Thresholding": { threshold: 0.5 },
};

const Columns: React.FC<{ columns: number | string }> = ({
  columns,
  children,
}) => (
  <Box
    display="grid"
    gridTemplateColumns={
      typeof columns === "number" ? `repeat(${columns}, 1fr)` : columns
    }
    columnGap={6}
    rowGap={4}
  >
    {children}
  </Box>
);

const displaySectionTitle = (section: string) => (
  <Typography variant="subtitle2" marginY={1.5}>
    {section}
  </Typography>
);

const KeyValuePairs: React.FC<{
  label: string;
  disabled: boolean;
  keyValuePairs: [string, React.ReactNode][];
}> = ({ label, disabled, keyValuePairs }) => {
  const sx = disabled
    ? { color: (theme: Theme) => theme.palette.text.disabled }
    : {};
  return (
    <Box display="flex" flexDirection="column">
      <Typography variant="caption" sx={sx}>
        {label}
      </Typography>
      <Box display="grid" gridTemplateColumns="max-content auto" gap={1}>
        {keyValuePairs.map(([key, value]) => (
          <React.Fragment key={key}>
            <Typography variant="body2" sx={sx}>
              {key}:
            </Typography>
            {value}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

const updateArrayAt = <T,>(array: T[], index: number, update: Partial<T>) =>
  splicedArray(array, index, 1, { ...array[index], ...update });

type Props = {
  open: boolean;
  onClose: () => void;
};

const Settings: React.FC<Props> = ({ open, onClose }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const [language, setLanguage] = React.useState<
    SupportedLanguage | undefined
  >();
  const { data: azimuthConfig } = getConfigEndpoint.useQuery({ jobId });
  const config = React.useMemo(
    () => azimuthConfig && azimuthConfigToConfigState(azimuthConfig),
    [azimuthConfig]
  );

  const [validateConfig, { isLoading: isValidatingConfig }] =
    validateConfigEndpoint.useMutation();

  const [updateConfig, { isLoading: isUpdatingConfig }] =
    updateConfigEndpoint.useMutation();

  const areInputsDisabled = isValidatingConfig || isUpdatingConfig;

  const [partialConfig, setPartialConfig] = React.useState<
    Partial<ConfigState>
  >({});

  const isEmptyPartialConfig = Object.keys(partialConfig).length === 0;

  const handleDiscard = () => {
    setPartialConfig({});
    setLanguage(undefined);
  };

  const handleClose = () => {
    handleDiscard();
    onClose();
  };

  const resultingConfig = React.useMemo(
    () => Object.assign({}, config, partialConfig),
    [config, partialConfig]
  );

  const {
    data: defaultConfig,
    isLoading,
    error,
  } = getDefaultConfigEndpoint.useQuery({
    jobId,
    language: language ?? resultingConfig.language,
  });

  const { data: configHistory } = getConfigHistoryEndpoint.useQuery({ jobId });

  const [configHistoryAnchor, setConfigHistoryAnchor] =
    React.useState<null | HTMLElement>(null);

  const updatePartialConfig = React.useCallback(
    (update: Partial<ConfigState>) =>
      setPartialConfig((partialConfig) => ({ ...partialConfig, ...update })),
    [setPartialConfig]
  );

  React.useEffect(() => {
    if (defaultConfig && resultingConfig.dataset === null) {
      updatePartialConfig({ dataset: defaultConfig.dataset });
    }
    if (defaultConfig && defaultConfig.language !== resultingConfig.language) {
      updatePartialConfig({
        language: defaultConfig.language,
        syntax: {
          ...resultingConfig.syntax,
          spacy_model: defaultConfig.syntax.spacy_model,
          subj_tags: defaultConfig.syntax.subj_tags,
          obj_tags: defaultConfig.syntax.obj_tags,
        },
        similarity: resultingConfig.similarity && {
          ...resultingConfig.similarity,
          faiss_encoder: defaultConfig.similarity!.faiss_encoder,
        },
        behavioral_testing: resultingConfig.behavioral_testing && {
          ...resultingConfig.behavioral_testing,
          neutral_token: {
            ...resultingConfig.behavioral_testing.neutral_token,
            suffix_list:
              defaultConfig.behavioral_testing!.neutral_token.suffix_list,
            prefix_list:
              defaultConfig.behavioral_testing!.neutral_token.prefix_list,
          },
        },
      });
    }
  }, [defaultConfig, resultingConfig, updatePartialConfig]);

  // If config was undefined, PipelineCheck would not even render the page.
  if (azimuthConfig === undefined || !open) return null;

  const metricsNames = new Set(
    resultingConfig.metrics.map(({ name }) => name.trim())
  );
  const hasErrors =
    resultingConfig.dataset?.class_name.trim() === "" ||
    metricsNames.size < resultingConfig.metrics.length ||
    metricsNames.has("") ||
    resultingConfig.metrics.some(({ class_name }) => class_name.trim() === "");

  const fullHashCount = new Set(configHistory?.map(({ hash }) => hash)).size;
  const hashCount = new Set(configHistory?.map(({ hash }) => hash.slice(0, 3)))
    .size;
  const nameCount = new Set(configHistory?.map(({ config }) => config.name))
    .size;

  // Don't show the hash (hashSize = null) if no two different configs have the same name.
  // Show a 6-char hash if there is a collision in the first 3 chars.
  // Otherwise, show a 3-char hash.
  // Probability of a hash collision with the 3-char hash:
  // 10 different configs: 1 %
  // 30 different configs: 10 %
  // 76 different configs: 50 %
  // With the 6-char hash:
  // 581 different configs: 1 %
  const hashChars =
    nameCount === fullHashCount ? null : hashCount === fullHashCount ? 3 : 6;

  const handleFileRead = (text: string) => {
    try {
      const body = JSON.parse(text);
      validateConfig({ jobId, body })
        .unwrap()
        .then((config) => setPartialConfig(azimuthConfigToConfigState(config)))
        .catch(() => {}); // Avoid the uncaught error log. Toast already raised by `rtkQueryErrorInterceptor` middleware.
    } catch (error) {
      raiseErrorToast(
        `Something went wrong parsing JSON file\n${
          (error as SyntaxError).message
        }`
      );
    }
  };

  const handleDownload = () => {
    const azimuthConfig = configStateToAzimuthConfig(resultingConfig);
    const text = JSON.stringify(azimuthConfig, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    downloadBlob(blob, "config.json");
  };

  const renderDialog = (children: React.ReactNode) => (
    <Dialog
      aria-labelledby="config-dialog-title"
      maxWidth="md"
      fullWidth
      open={open}
    >
      <DialogTitle id="config-dialog-title">
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="inherit" flex={1}>
            Configuration
          </Typography>
          {configHistory?.length && (
            <>
              <Button
                disabled={areInputsDisabled}
                startIcon={<History />}
                endIcon={<ArrowDropDown />}
                onClick={(event) => setConfigHistoryAnchor(event.currentTarget)}
              >
                Load previous config
              </Button>
              <Menu
                anchorEl={configHistoryAnchor}
                open={Boolean(configHistoryAnchor)}
                onClick={() => setConfigHistoryAnchor(null)}
              >
                {configHistory
                  .map(({ config, created_on, hash }, index) => (
                    <MenuItem
                      key={index}
                      sx={{ gap: 2 }}
                      onClick={() => {
                        setConfigHistoryAnchor(null);
                        setPartialConfig(azimuthConfigToConfigState(config));
                      }}
                    >
                      <Typography flex={1}>{config.name}</Typography>
                      {hashChars && (
                        <HashChip hash={hash.slice(0, hashChars)} />
                      )}
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "Monospace" }}
                      >
                        {formatDateISO(new Date(created_on))}
                      </Typography>
                    </MenuItem>
                  ))
                  .reverse()}
              </Menu>
            </>
          )}
          <FileInputButton
            accept=".json"
            disabled={areInputsDisabled}
            startIcon={<Upload />}
            onFileRead={handleFileRead}
          >
            Import JSON config file
          </FileInputButton>
          <Button
            disabled={areInputsDisabled}
            startIcon={<Download />}
            onClick={handleDownload}
          >
            Export JSON config file
          </Button>
          <IconButton
            size="small"
            color="primary"
            disabled={areInputsDisabled}
            onClick={() => {
              if (
                isEmptyPartialConfig ||
                window.confirm(
                  "Are you sure you want to discard all your changes?"
                )
              ) {
                handleClose();
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          [`& .${formControlLabelClasses.root}`]: { alignSelf: "start" },
          [`& .${formControlLabelClasses.labelPlacementStart}`]: {
            marginLeft: 0,
          },
          [`& .${formGroupClasses.root}`]: { marginX: 2, marginBottom: 2 },
          [`& .${inputClasses.root}`]: {
            fontSize: 14,
            paddingY: "0 !important", // for multiline Input, !important for Autocomplete
          },
          [`& .${inputClasses.input}`]: {
            paddingY: "0 !important", // for regular Input, !important for Autocomplete
          },
          [`& .${inputLabelClasses.root}`]: { fontWeight: "bold" },
        }}
      >
        {children}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={areInputsDisabled || isEmptyPartialConfig}
          onClick={handleDiscard}
        >
          Discard
        </Button>
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="end"
          gap={1}
        >
          {isUpdatingConfig ? (
            <>
              <CircularProgress size={16} />
              <FormHelperText>{CONFIG_UPDATE_MESSAGE}</FormHelperText>
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
        </Box>
        <Button
          variant="contained"
          disabled={areInputsDisabled || isEmptyPartialConfig || hasErrors}
          onClick={() => {
            updateConfig({
              jobId,
              body: configStateToAzimuthConfig(partialConfig),
            })
              .unwrap()
              .then(handleClose)
              .catch(() => {}); // Avoid the uncaught error log. Toast already raised by `rtkQueryErrorInterceptor` middleware.
          }}
        >
          Apply and close
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (isLoading) {
    return renderDialog(<Loading />);
  } else if (error || defaultConfig === undefined) {
    return renderDialog(
      <Box alignItems="center" display="grid" justifyItems="center">
        <img src={noData} width="50%" alt="No default config data available" />
        <Typography>{error?.message || UNKNOWN_ERROR}</Typography>
      </Box>
    );
  }

  const updateSubConfig = <Key extends SubConfigKeys>(
    key: Key,
    update: Partial<ConfigState[Key]>
  ) => updatePartialConfig({ [key]: { ...resultingConfig[key], ...update } });

  const updatePipeline = (
    pipelineIndex: number,
    update: Partial<PipelineDefinition>
  ) =>
    updatePartialConfig({
      pipelines: updateArrayAt(
        resultingConfig.pipelines!,
        pipelineIndex,
        update
      ),
    });

  const updateModel = (
    pipelineIndex: number,
    update: Partial<PipelineDefinition["model"]>
  ) =>
    updatePipeline(pipelineIndex, {
      model: { ...resultingConfig.pipelines![pipelineIndex].model, ...update },
    });

  const updatePostprocessor = (
    pipelineIndex: number,
    postprocessorIndex: number,
    update: Partial<NonNullable<PipelineDefinition["postprocessors"]>[number]>
  ) =>
    updatePipeline(pipelineIndex, {
      postprocessors: updateArrayAt(
        resultingConfig.pipelines![pipelineIndex].postprocessors!,
        postprocessorIndex,
        update
      ),
    });

  const getDefaultPostprocessors = (pipelineIndex: number) =>
    azimuthConfig.pipelines?.[pipelineIndex]?.postprocessors ?? // TODO pipelineIndex might not correspond if the user added or removed pipelines
    defaultConfig.pipelines![0].postprocessors!;

  const updateMetric = (metricIndex: number, update: Partial<MetricState>) =>
    updatePartialConfig({
      metrics: updateArrayAt(resultingConfig.metrics, metricIndex, update),
    });

  const displayToggleSectionTitle = (
    field: keyof ConfigState,
    section: string = field
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={Boolean(resultingConfig[field])}
          disabled={areInputsDisabled}
          onChange={(...[, checked]) =>
            updatePartialConfig({
              [field]: checked ? defaultConfig[field] : null,
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
          disabled={areInputsDisabled}
          onChange={(...[, checked]) =>
            updatePipeline(pipelineIndex, {
              postprocessors: checked
                ? getDefaultPostprocessors(pipelineIndex)
                : null,
            })
          }
        />
      }
      label={displaySectionTitle("Postprocessors")}
      labelPlacement="start"
    />
  );

  const projectConfigSection = (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={4}>
          <StringField
            label="name"
            value={resultingConfig.name}
            originalValue={azimuthConfig.name}
            disabled={areInputsDisabled}
            onChange={(name) => updatePartialConfig({ name })}
          />
          <StringField
            label="rejection_class"
            nullable
            value={resultingConfig.rejection_class}
            originalValue={azimuthConfig.rejection_class}
            disabled={areInputsDisabled}
            onChange={(rejection_class) =>
              updatePartialConfig({ rejection_class })
            }
          />
          <KeyValuePairs
            label="columns"
            disabled={areInputsDisabled}
            keyValuePairs={COLUMNS.map((column) => [
              column,
              <StringField
                value={resultingConfig.columns[column]}
                originalValue={azimuthConfig.columns[column]}
                disabled={areInputsDisabled}
                onChange={(newValue) =>
                  updateSubConfig("columns", { [column]: newValue })
                }
              />,
            ])}
          />
        </Columns>
      </FormGroup>
      {resultingConfig.dataset && (
        <>
          {displaySectionTitle("Dataset")}
          <FormGroup>
            <Columns columns={2}>
              <CustomObjectFields
                disabled={areInputsDisabled}
                value={resultingConfig.dataset}
                originalValue={azimuthConfig.dataset ?? undefined}
                onChange={(update) => updateSubConfig("dataset", update)}
              />
            </Columns>
          </FormGroup>
        </>
      )}
    </>
  );

  const modelContractConfigSection = (
    <>
      {displaySectionTitle("General")}
      <FormGroup>
        <Columns columns={4}>
          <StringField
            label="model_contract"
            options={SUPPORTED_MODEL_CONTRACTS}
            value={resultingConfig.model_contract}
            originalValue={azimuthConfig.model_contract}
            disabled={areInputsDisabled}
            onChange={(model_contract) =>
              updatePartialConfig({ model_contract })
            }
          />
          <StringField
            label="saliency_layer"
            nullable
            value={resultingConfig.saliency_layer}
            originalValue={azimuthConfig.saliency_layer}
            disabled={areInputsDisabled}
            onChange={(saliency_layer) =>
              updatePartialConfig({ saliency_layer })
            }
          />
          <KeyValuePairs
            label="uncertainty"
            disabled={areInputsDisabled || resultingConfig.uncertainty === null}
            keyValuePairs={Object.entries(resultingConfig.uncertainty).map(
              ([field, value]) => [
                field,
                <NumberField
                  value={value}
                  originalValue={
                    azimuthConfig.uncertainty[
                      field as keyof AzimuthConfig["uncertainty"]
                    ]
                  }
                  disabled={
                    areInputsDisabled || resultingConfig.uncertainty === null
                  }
                  onChange={(newValue) =>
                    updateSubConfig("uncertainty", { [field]: newValue })
                  }
                  {...FIELDS[field]}
                />,
              ]
            )}
          />
        </Columns>
      </FormGroup>
      {displaySectionTitle("Pipelines")}
      <EditableArray
        array={resultingConfig.pipelines ?? []}
        disabled={areInputsDisabled}
        title="pipeline"
        newItem={defaultConfig.pipelines![0]}
        onChange={(pipelines) => updatePartialConfig({ pipelines })}
        renderItem={(pipeline, pipelineIndex) => (
          <FormGroup>
            <FormControl>
              {displaySectionTitle("General")}
              <FormGroup>
                <Columns columns={2}>
                  <StringField
                    label="name"
                    value={pipeline.name}
                    originalValue={
                      azimuthConfig.pipelines?.[pipelineIndex]?.name
                    }
                    disabled={areInputsDisabled}
                    onChange={(name) => updatePipeline(pipelineIndex, { name })}
                  />
                </Columns>
              </FormGroup>
              {displaySectionTitle("Model")}
              <FormGroup>
                <Columns columns={2}>
                  <StringField
                    label="class_name"
                    value={pipeline.model.class_name}
                    originalValue={
                      azimuthConfig.pipelines?.[pipelineIndex]?.model.class_name
                    }
                    disabled={areInputsDisabled}
                    onChange={(class_name) =>
                      updateModel(pipelineIndex, { class_name })
                    }
                  />
                  <StringField
                    label="remote"
                    nullable
                    value={pipeline.model.remote}
                    originalValue={
                      azimuthConfig.pipelines?.[pipelineIndex]?.model.remote
                    }
                    disabled={areInputsDisabled}
                    onChange={(remote) =>
                      updateModel(pipelineIndex, { remote })
                    }
                  />
                  <JSONField
                    array
                    label="args"
                    value={pipeline.model.args}
                    originalValue={
                      azimuthConfig.pipelines?.[pipelineIndex]?.model.args
                    }
                    disabled={areInputsDisabled}
                    onChange={(args) => updateModel(pipelineIndex, { args })}
                  />
                  <JSONField
                    label="kwargs"
                    value={pipeline.model.kwargs}
                    originalValue={
                      azimuthConfig.pipelines?.[pipelineIndex]?.model.kwargs
                    }
                    disabled={areInputsDisabled}
                    onChange={(kwargs) =>
                      updateModel(pipelineIndex, { kwargs })
                    }
                  />
                </Columns>
              </FormGroup>
              {displayPostprocessorToggleSection(pipelineIndex, pipeline)}
              <EditableArray
                array={
                  pipeline.postprocessors ??
                  getDefaultPostprocessors(pipelineIndex)
                }
                disabled={areInputsDisabled || pipeline.postprocessors === null}
                title="post-processor"
                newItem={{ class_name: "", args: [], kwargs: {}, remote: null }}
                onChange={(postprocessors) =>
                  updatePipeline(pipelineIndex, { postprocessors })
                }
                renderItem={(postprocessor, index, postprocessors) => (
                  <FormGroup sx={{ marginTop: 2 }}>
                    <Columns columns={2}>
                      <AutocompleteStringField
                        label="class_name"
                        options={Object.keys(KNOWN_POSTPROCESSORS)}
                        value={postprocessor.class_name}
                        originalValue={
                          azimuthConfig.pipelines?.[pipelineIndex]
                            ?.postprocessors?.[index]?.class_name
                        }
                        autoFocus
                        disabled={
                          areInputsDisabled || pipeline.postprocessors === null
                        }
                        onChange={(class_name) =>
                          updatePipeline(pipelineIndex, {
                            postprocessors: splicedArray(
                              postprocessors,
                              index,
                              1,
                              {
                                args: [],
                                kwargs: {},
                                remote: null,
                                ...(KNOWN_POSTPROCESSORS[
                                  class_name as keyof typeof KNOWN_POSTPROCESSORS
                                ] ||
                                  postprocessor.class_name in
                                    KNOWN_POSTPROCESSORS || // true spreads nothing
                                  postprocessor),
                                class_name,
                              }
                            ),
                          })
                        }
                      />
                      {!(postprocessor.class_name in KNOWN_POSTPROCESSORS) && (
                        <CustomObjectFields
                          excludeClassName
                          disabled={areInputsDisabled}
                          value={postprocessor}
                          originalValue={
                            azimuthConfig.pipelines?.[pipelineIndex]
                              ?.postprocessors?.[index]?.class_name ===
                            postprocessor.class_name
                              ? azimuthConfig.pipelines?.[pipelineIndex]
                                  ?.postprocessors?.[index]
                              : undefined
                          }
                          onChange={(update) =>
                            updatePostprocessor(pipelineIndex, index, update)
                          }
                        />
                      )}
                      {"temperature" in postprocessor && (
                        <NumberField
                          label="temperature"
                          value={postprocessor.temperature}
                          originalValue={
                            (
                              azimuthConfig.pipelines?.[pipelineIndex]
                                ?.postprocessors?.[index] as any
                            )?.temperature
                          }
                          disabled={
                            areInputsDisabled ||
                            pipeline.postprocessors === null
                          }
                          onChange={(temperature) =>
                            updatePostprocessor(pipelineIndex, index, {
                              temperature,
                              kwargs: { temperature },
                            })
                          }
                          {...FLOAT}
                        />
                      )}
                      {"threshold" in postprocessor && (
                        <NumberField
                          label="threshold"
                          value={postprocessor.threshold}
                          originalValue={
                            (
                              azimuthConfig.pipelines?.[pipelineIndex]
                                ?.postprocessors?.[index] as any
                            )?.threshold
                          }
                          disabled={
                            areInputsDisabled ||
                            pipeline.postprocessors === null
                          }
                          onChange={(threshold) =>
                            updatePostprocessor(pipelineIndex, index, {
                              threshold,
                              kwargs: { threshold },
                            })
                          }
                          {...PERCENTAGE}
                        />
                      )}
                    </Columns>
                  </FormGroup>
                )}
              />
            </FormControl>
          </FormGroup>
        )}
      />
      {displaySectionTitle("Metrics")}
      <EditableArray
        array={resultingConfig.metrics}
        disabled={areInputsDisabled}
        title="metric"
        newItem={{
          name: "",
          class_name: "",
          args: [],
          kwargs: {},
          remote: null,
          additional_kwargs: {},
        }}
        onChange={(metrics) => updatePartialConfig({ metrics })}
        renderItem={(metric, index) => (
          <FormGroup sx={{ marginTop: 2 }}>
            <Columns columns={3}>
              <AutocompleteStringField
                label="name"
                options={Object.keys(defaultConfig.metrics)}
                value={metric.name}
                originalValue={undefined}
                {...(splicedArray(resultingConfig.metrics, index, 1).some(
                  ({ name }) => name.trim() === metric.name.trim()
                ) && {
                  error: true,
                  helperText: "Set a value that is unique across all metrics",
                })}
                autoFocus
                disabled={areInputsDisabled}
                onChange={(name) =>
                  updateMetric(index, { name, ...defaultConfig.metrics[name] })
                }
              />
              <CustomObjectFields
                disabled={areInputsDisabled}
                value={metric}
                originalValue={azimuthConfig.metrics[metric.name]}
                onChange={(update) => updateMetric(index, update)}
              />
              <JSONField
                label="additional_kwargs"
                value={metric.additional_kwargs}
                originalValue={
                  azimuthConfig.metrics[metric.name]?.additional_kwargs
                }
                disabled={areInputsDisabled}
                onChange={(additional_kwargs) =>
                  updateMetric(index, { additional_kwargs })
                }
              />
            </Columns>
          </FormGroup>
        )}
      />
    </>
  );

  const getAnalysesCustomization = (config: SubConfigKeys) => (
    <FormGroup>
      <Columns
        columns={config === "behavioral_testing" ? "3fr 1fr 1fr 2fr" : 5}
      >
        {Object.entries(
          resultingConfig[config] ?? defaultConfig[config] ?? {}
        ).map(([field, value]) =>
          field in FIELDS ? (
            <NumberField
              key={field}
              label={field}
              value={value}
              originalValue={
                ((azimuthConfig[config] ?? defaultConfig[config]) as any)[field]
              }
              disabled={areInputsDisabled || resultingConfig[config] === null}
              onChange={(newValue) =>
                updateSubConfig(config, { [field]: newValue })
              }
              {...FIELDS[field]}
            />
          ) : Array.isArray(value) ? (
            <StringArrayField
              key={field}
              label={field}
              value={value}
              originalValue={
                ((azimuthConfig[config] ?? defaultConfig[config]) as any)[field]
              }
              disabled={areInputsDisabled || resultingConfig[config] === null}
              onChange={(newValue) =>
                updateSubConfig(config, { [field]: newValue })
              }
            />
          ) : typeof value === "object" ? (
            <KeyValuePairs
              key={field}
              label={field}
              disabled={areInputsDisabled || resultingConfig[config] === null}
              keyValuePairs={Object.entries(value).map(
                ([objField, objValue]) => [
                  objField,
                  Array.isArray(objValue) ? (
                    <StringArrayField
                      value={objValue}
                      originalValue={
                        (
                          (azimuthConfig[config] ??
                            defaultConfig[config]) as any
                        )[field][objField]
                      }
                      disabled={
                        areInputsDisabled || resultingConfig[config] === null
                      }
                      onChange={(newValue) =>
                        updateSubConfig(config, {
                          [field]: { ...value, [objField]: newValue },
                        })
                      }
                    />
                  ) : (
                    <NumberField
                      value={objValue as number}
                      originalValue={
                        (
                          (azimuthConfig[config] ??
                            defaultConfig[config]) as any
                        )[field][objField]
                      }
                      disabled={
                        areInputsDisabled || resultingConfig[config] === null
                      }
                      onChange={(newValue) =>
                        updateSubConfig(config, {
                          [field]: { ...value, [objField]: newValue },
                        })
                      }
                      {...FIELDS[objField]}
                    />
                  ),
                ]
              )}
            />
          ) : config === "syntax" && field === "spacy_model" ? (
            <StringField
              key={field}
              label={field}
              options={SUPPORTED_SPACY_MODELS}
              value={resultingConfig.syntax.spacy_model}
              originalValue={azimuthConfig.syntax.spacy_model}
              disabled={areInputsDisabled}
              onChange={(spacy_model) =>
                updateSubConfig("syntax", { spacy_model })
              }
            />
          ) : (
            typeof value === "string" && (
              <StringField
                key={field}
                label={field}
                value={value}
                originalValue={
                  ((azimuthConfig[config] ?? defaultConfig[config]) as any)[
                    field
                  ] as string
                }
                disabled={areInputsDisabled || resultingConfig[config] === null}
                onChange={(newValue) =>
                  updateSubConfig(config, { [field]: newValue })
                }
              />
            )
          )
        )}
      </Columns>
    </FormGroup>
  );

  const commonFieldsConfigSection = (
    <FormGroup sx={{ marginTop: 2 }}>
      <Columns columns={4}>
        <StringField
          label="artifact_path"
          value={resultingConfig.artifact_path}
          originalValue={undefined}
          disabled={areInputsDisabled}
          InputProps={{ readOnly: true, disableUnderline: true }}
          onChange={() => {}}
        />
        <NumberField
          label="batch_size"
          value={resultingConfig.batch_size}
          originalValue={azimuthConfig.batch_size}
          disabled={areInputsDisabled}
          onChange={(batch_size) => updatePartialConfig({ batch_size })}
          {...INT}
        />
        <StringField
          label="use_cuda"
          options={USE_CUDA_OPTIONS}
          className="fixedWidthInput"
          value={String(resultingConfig.use_cuda) as UseCUDAOption}
          originalValue={String(azimuthConfig.use_cuda) as UseCUDAOption}
          disabled={areInputsDisabled}
          onChange={(use_cuda) =>
            updatePartialConfig({
              use_cuda: use_cuda === "auto" ? "auto" : use_cuda === "true",
            })
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={resultingConfig.large_dask_cluster}
              disabled={areInputsDisabled}
              onChange={(...[, large_dask_cluster]) =>
                updatePartialConfig({ large_dask_cluster })
              }
            />
          }
          label="large_dask_cluster"
          sx={{ justifySelf: "start" }} // Make hit box tight on the component.
        />
      </Columns>
    </FormGroup>
  );

  const analysesCustomizationGeneralSection = (
    <FormGroup>
      <Box display="flex" gap={5} alignItems="center">
        <StringField
          label="language"
          options={SUPPORTED_LANGUAGES}
          sx={{ width: "6ch" }}
          value={language ?? resultingConfig.language}
          originalValue={azimuthConfig.language}
          disabled={areInputsDisabled}
          onChange={(newValue) => setLanguage(newValue)}
        />
        <Box display="flex" gap={1}>
          <Warning color="warning" />
          <Typography variant="body2">
            Changing the language would impact the Syntax, Similarity and
            Behavioral Testing sections
          </Typography>
        </Box>
      </Box>
    </FormGroup>
  );

  const analysesCustomizationSection = (
    <>
      {displaySectionTitle("General")}
      {analysesCustomizationGeneralSection}
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

  return renderDialog(
    <>
      <AccordionLayout
        name="Project Configuration"
        description="View the fields that define the dataset to load in Azimuth."
        link="reference/configuration/project/"
        defaultExpanded
      >
        {projectConfigSection}
      </AccordionLayout>
      <AccordionLayout
        name="Model Contract Configuration"
        description="View and edit some fields that define the ML pipelines and the metrics."
        link="reference/configuration/model_contract/"
      >
        {modelContractConfigSection}
      </AccordionLayout>
      <AccordionLayout
        name="Common Fields Configuration"
        description="View and edit generic fields that can be adapted based on the user's machine."
        link="reference/configuration/common/"
      >
        {commonFieldsConfigSection}
      </AccordionLayout>
      <AccordionLayout
        name="Analyses Customization"
        description="Enable or disable some analyses and edit corresponding thresholds."
        link="reference/configuration/analyses/"
      >
        {analysesCustomizationSection}
      </AccordionLayout>
    </>
  );
};

export default React.memo(Settings);
