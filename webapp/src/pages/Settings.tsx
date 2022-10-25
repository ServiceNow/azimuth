import _ from "lodash";
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputBaseComponentProps,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { getConfigEndpoint, updateConfigEndpoint } from "services/api";
import { AzimuthConfig } from "types/api";
import { Info } from "@mui/icons-material";

const DOCS_URL =
  "https://servicenow.github.io/azimuth/main/reference/configuration/";

const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof AzimuthConfig)[] = [
  "behavioral_testing",
  "dataset_warnings",
  "similarity",
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

  const switchNullOrDefault = (field: keyof AzimuthConfig) => (
    <Checkbox
      checked={Boolean(resultingConfig[field])}
      disabled={isError || isFetching}
      onChange={(_, checked) =>
        setPartialConfig({ ...partialConfig, [field]: checked ? {} : null })
      }
    />
  );

  const displayConfigTitle = (title: string, link: string) => (
    <Box display="flex" gap={1} marginTop={0.5}>
      <Typography variant="body1">{title}</Typography>
      <Link
        href={DOCS_URL + link}
        variant="body2"
        color="secondary"
        target="_blank"
      >
        <Info color="primary" fontSize="small" sx={{ marginTop: 0.5 }} />
      </Link>
    </Box>
  );

  const displaySubFields = (
    config: keyof AzimuthConfig,
    label: string,
    field: string,
    limit: InputBaseComponentProps,
    value: number | undefined
  ) => (
    <TextField
      sx={{ marginLeft: 5, marginBottom: 2 }}
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
    <Container maxWidth="sm">
      <FormControl sx={{ width: "100%" }}>
        <FormGroup>
          <FormControlLabel
            control={switchNullOrDefault("behavioral_testing")}
            label={displayConfigTitle(
              "Behavioral testing",
              "analyses/behavioral_testing/"
            )}
          />
          <FormControlLabel
            control={switchNullOrDefault("similarity")}
            label={displayConfigTitle("Similarity", "analyses/similarity/")}
          />
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            sx={{
              "& .MuiTextField-root": { width: "25ch" },
            }}
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
          {displayConfigTitle("Dataset Warnings", "analyses/dataset_warnings/")}
          {Boolean(resultingConfig.dataset_warnings) && (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              sx={{
                "& .MuiTextField-root": { width: "25ch" },
              }}
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
          {displayConfigTitle("Syntax", "analyses/syntax/")}
          {Boolean(resultingConfig.syntax) && (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              sx={{
                "& .MuiTextField-root": { width: "25ch" },
              }}
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
          {displayConfigTitle("Uncertainty", "model_contract/#uncertainty")}
          {Boolean(resultingConfig.uncertainty) && (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              sx={{
                "& .MuiTextField-root": { width: "25ch" },
              }}
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
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={1}
          marginRight={25}
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
    </Container>
  );
};

export default React.memo(Settings);
