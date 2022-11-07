import { Info } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputBaseComponentProps,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import _ from "lodash";
import React from "react";
import { useParams } from "react-router-dom";
import { getConfigEndpoint, updateConfigEndpoint } from "services/api";
import { AzimuthConfig } from "types/api";

const DOCS_URL = "https://servicenow.github.io/azimuth/main/reference/";
const FIELDS_WIDTH = 380;
const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof AzimuthConfig)[] = [
  "pipelines",
  "metrics",
  "behavioral_testing",
  "similarity",
  "dataset_warnings",
  "syntax",
  "uncertainty",
];

const Settings: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();

  const { data, isError, isFetching } = getConfigEndpoint.useQuery({ jobId });

  const [updateConfig] = updateConfigEndpoint.useMutation();

  const [partialConfig, setPartialConfig] = React.useState<
    Partial<AzimuthConfig>
  >({});

  const resultingConfig = { ...data, ...partialConfig };

  const handleCustomMetricDelete = (name: string) => {
    resultingConfig?.metrics &&
      Object.keys(resultingConfig?.metrics)
        .filter((metric) => metric !== name)
        .map((metricName) =>
          setPartialConfig(
            _.merge(partialConfig, {
              metrics: {
                [metricName]: resultingConfig?.metrics?.[metricName],
              },
            })
          )
        );
  };
  const switchNullOrDefault = (field: keyof AzimuthConfig) => (
    <Checkbox
      checked={Boolean(resultingConfig[field])}
      disabled={isError || isFetching}
      onChange={(_, checked) =>
        setPartialConfig({ ...partialConfig, [field]: checked ? {} : null })
      }
    />
  );

  const displayConfigTitle = (title: string, link?: string) => (
    <Box display="flex" gap={1}>
      <Typography variant="body1">{title}</Typography>
      {link && (
        <Link
          href={DOCS_URL + link}
          variant="body2"
          color="secondary"
          target="_blank"
        >
          <Info color="primary" fontSize="small" />
        </Link>
      )}
    </Box>
  );

  const displayReadonlyFields = (
    label: React.ReactElement,
    defaultValue: string | undefined
  ) =>
    defaultValue ? (
      <TextField
        sx={{ width: FIELDS_WIDTH }}
        label={label}
        defaultValue={defaultValue}
        InputProps={{
          readOnly: true,
        }}
        variant="standard"
      />
    ) : (
      <></>
    );

  const displaySubFields = (
    config: keyof AzimuthConfig,
    label: string,
    field: string,
    limit: InputBaseComponentProps,
    value: number | undefined
  ) => (
    <TextField
      sx={{ width: FIELDS_WIDTH, marginLeft: 5, marginBottom: 2 }}
      id={field}
      label={label}
      type="number"
      InputLabelProps={{
        shrink: true,
      }}
      defaultValue={value}
      disabled={!Boolean(resultingConfig[config])}
      inputProps={limit}
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

  return (
    <Paper variant="outlined" sx={{ height: "100%", padding: 4 }}>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-around"
        gap={3}
        sx={{
          position: "sticky",
          margin: 2,
          background: (theme) => theme.palette.background.paper,
        }}
      >
        {displayReadonlyFields(
          displayConfigTitle("Config name", "configuration/project/#name"),
          resultingConfig.name
        )}
        {displayReadonlyFields(
          displayConfigTitle(
            "Dataset class name",
            "configuration/project/#dataset"
          ),
          resultingConfig.dataset?.class_name
        )}
        {displayReadonlyFields(
          displayConfigTitle(
            "Model contract",
            "configuration/model_contract/#model-contract"
          ),
          resultingConfig.model_contract
        )}
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        sx={{
          width: "100%",
          height: "95%",
          overflow: "scroll",
          paddingX: 20,
          paddingY: 2,
        }}
      >
        {displayConfigTitle(
          "Pipelines",
          "configuration/model_contract/#pipelines"
        )}
        {resultingConfig?.pipelines?.map(
          ({ name, model, postprocessors }, index) => (
            <Box
              key={name}
              display="flex"
              flexDirection="column"
              marginX={4}
              marginY={1}
            >
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-start"
                gap={5}
              >
                {displayReadonlyFields(displayConfigTitle("name"), name)}
                {displayReadonlyFields(
                  displayConfigTitle("model"),
                  model.class_name
                )}
              </Box>
              <Box display="flex" flexDirection="column" marginY={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(postprocessors)}
                      disabled={isError || isFetching}
                      onChange={(_, checked) =>
                        setPartialConfig({
                          ...partialConfig,
                          pipelines: [
                            {
                              ...{ name, model },
                              postprocessors: checked ? [] : null,
                            },
                          ],
                        })
                      }
                    />
                  }
                  label={displayConfigTitle(
                    "Postprocessors",
                    "custom-objects/postprocessors/"
                  )}
                />
                {postprocessors &&
                  postprocessors.map(
                    ({ class_name, temperature, threshold }) => (
                      <Box
                        display="flex"
                        flexDirection="row"
                        justifyContent="flex-start"
                        gap={4}
                        marginLeft={4}
                      >
                        {displayReadonlyFields(
                          displayConfigTitle("name"),
                          class_name
                        )}
                        {temperature && (
                          <TextField
                            sx={{
                              width: FIELDS_WIDTH,
                              marginLeft: 5,
                              marginBottom: 2,
                            }}
                            id="temperature"
                            label="Temperature"
                            type="number"
                            InputLabelProps={{
                              shrink: true,
                            }}
                            value={temperature}
                            inputProps={{ min: 0, max: 1, step: 0.1 }}
                            variant="standard"
                            onChange={(event) =>
                              setPartialConfig({
                                ...partialConfig,
                                pipelines: [
                                  {
                                    ...{ name, model },
                                    postprocessors: [
                                      {
                                        temperature: Number(event.target.value),
                                      },
                                    ],
                                  },
                                ],
                              })
                            }
                          />
                        )}
                        {threshold && (
                          <TextField
                            sx={{
                              width: FIELDS_WIDTH,
                              marginLeft: 5,
                              marginBottom: 2,
                            }}
                            id="threshold"
                            label="Threshold"
                            type="number"
                            InputLabelProps={{
                              shrink: true,
                            }}
                            value={threshold}
                            inputProps={{ min: 0, max: 1, step: 0.1 }}
                            variant="standard"
                            onChange={(event) =>
                              setPartialConfig({
                                ...partialConfig,
                                pipelines: [
                                  {
                                    ...{ name, model },
                                    postprocessors: [
                                      {
                                        threshold: Number(event.target.value),
                                      },
                                    ],
                                  },
                                ],
                              })
                            }
                          />
                        )}
                      </Box>
                    )
                  )}
              </Box>
            </Box>
          )
        )}
        {resultingConfig?.metrics && (
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="flex-start"
            gap={1}
            margin={2}
          >
            {displayConfigTitle("Metrics: ", "custom-objects/metric/")}
            {Object.keys(resultingConfig.metrics).map((metricName) => (
              <Chip
                label={metricName}
                variant="outlined"
                onDelete={() => handleCustomMetricDelete(metricName)}
              />
            ))}
          </Box>
        )}
        <FormControl>
          <FormGroup>
            <FormControlLabel
              control={switchNullOrDefault("behavioral_testing")}
              label={displayConfigTitle(
                "Perturbation testing",
                "configuration/analyses/behavioral_testing/"
              )}
            />
            <FormControlLabel
              control={switchNullOrDefault("similarity")}
              label={displayConfigTitle(
                "Similarity",
                "configuration/analyses/similarity/"
              )}
            />
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              gap={1}
            >
              {displaySubFields(
                "similarity",
                "Conflicting neighbors threshold",
                "conflicting_neighbors_threshold",
                { min: 0, max: 1, step: 0.1 },
                resultingConfig.similarity?.conflicting_neighbors_threshold
              )}
              {displaySubFields(
                "similarity",
                "No close threshold",
                "no_close_threshold",
                { min: 0, max: 1, step: 0.1 },
                resultingConfig.similarity?.no_close_threshold
              )}
            </Box>
            {displayConfigTitle(
              "Dataset Warnings",
              "configuration/analyses/dataset_warnings/"
            )}
            {Boolean(resultingConfig.dataset_warnings) && (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={1}
              >
                {displaySubFields(
                  "dataset_warnings",
                  "Min num per class",
                  "min_num_per_class",
                  { min: 0, max: 100, step: 10 },
                  resultingConfig.dataset_warnings?.min_num_per_class
                )}
                {displaySubFields(
                  "dataset_warnings",
                  "Max delta representation",
                  "max_delta_representation",
                  { min: 0, max: 0.1, step: 0.01 },
                  resultingConfig.dataset_warnings?.max_delta_representation
                )}
                {displaySubFields(
                  "dataset_warnings",
                  "Max delta mean tokens",
                  "max_delta_mean_tokens",
                  { min: 0.0, max: 10.0, step: 1.0 },
                  resultingConfig.dataset_warnings?.max_delta_mean_tokens
                )}
                {displaySubFields(
                  "dataset_warnings",
                  "Max delta std tokens",
                  "max_delta_std_tokens",
                  { min: 0.0, max: 10.0, step: 1.0 },
                  resultingConfig.dataset_warnings?.max_delta_std_tokens
                )}
                {displaySubFields(
                  "dataset_warnings",
                  "Max delta class imbalance",
                  "max_delta_class_imbalance",
                  { min: 0, max: 1, step: 0.1 },
                  resultingConfig.dataset_warnings?.max_delta_class_imbalance
                )}
              </Box>
            )}
            {displayConfigTitle("Syntax", "configuration/analyses/syntax/")}
            {Boolean(resultingConfig.syntax) && (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={1}
              >
                {displaySubFields(
                  "syntax",
                  "Short sentence max token",
                  "short_sentence_max_token",
                  { min: 0, max: 100, step: 1 },
                  resultingConfig.syntax?.short_sentence_max_token
                )}
                {displaySubFields(
                  "syntax",
                  "Long sentence min token",
                  "long_sentence_min_token",
                  { min: 0, max: 100, step: 1 },
                  resultingConfig.syntax?.long_sentence_min_token
                )}
              </Box>
            )}
            {displayConfigTitle(
              "Uncertainty",
              "configuration/model_contract/#uncertainty"
            )}
            {Boolean(resultingConfig.uncertainty) && (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={1}
              >
                {displaySubFields(
                  "uncertainty",
                  "Iterations",
                  "iterations",
                  {
                    min: 0,
                    max: 100,
                    step: 1,
                  },
                  resultingConfig.uncertainty?.iterations
                )}
                {displaySubFields(
                  "uncertainty",
                  "High epistemic threshold",
                  "high_epistemic_threshold",
                  { min: 0, max: 1, step: 0.1 },
                  resultingConfig.uncertainty?.high_epistemic_threshold
                )}
              </Box>
            )}
          </FormGroup>
          {console.log(partialConfig)}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={1}
            sx={{ position: "sticky", bottom: 5 }}
          >
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
        </FormControl>
      </Box>
    </Paper>
  );
};

export default React.memo(Settings);
