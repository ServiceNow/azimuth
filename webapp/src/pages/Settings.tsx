import {
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Switch,
} from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { getConfigEndpoint, updateConfigEndpoint } from "services/api";
import { AzimuthConfig } from "types/api";

const FIELDS_TRIGGERING_STARTUP_TASKS: (keyof AzimuthConfig)[] = [
  "behavioral_testing",
  "similarity",
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
    <Switch
      checked={Boolean(resultingConfig[field])}
      disabled={isError || isFetching}
      onChange={(_, checked) =>
        setPartialConfig({ ...partialConfig, [field]: checked ? {} : null })
      }
    />
  );

  return (
    <Container maxWidth="sm">
      <FormControl sx={{ width: "100%" }}>
        <FormGroup>
          <FormControlLabel
            control={switchNullOrDefault("behavioral_testing")}
            label="Perturbation testing"
          />
          <FormControlLabel
            control={switchNullOrDefault("similarity")}
            label="Similarity"
          />
        </FormGroup>
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
      </FormControl>
    </Container>
  );
};

export default React.memo(Settings);
