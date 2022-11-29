import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Slider,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import noData from "assets/void.svg";
import Description from "components/Description";
import Loading from "components/Loading";
import { PlotWrapper } from "components/PlotWrapper";
import useDebounced from "hooks/useDebounced";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { getClassAnalysisPlotEndpoint } from "services/api";
import { QueryClassOverlapState } from "types/models";
import { constructSearchString } from "utils/helpers";

export const classAnalysisDescription = (
  <Description
    text="Assess overlap between class pairs."
    link="/class-analysis/"
  />
);

const OVERLAP_THRESHOLD_INPUT_PROPS = { step: 0.01, min: 0, max: 1 };

const ClassOverlap = () => {
  const history = useHistory();
  const { jobId } = useParams<{ jobId: string }>();
  const { classOverlap, pipeline } = useQueryState();

  const { data, error, isFetching } = getClassAnalysisPlotEndpoint.useQuery({
    jobId,
    ...classOverlap,
  });

  // Control overlap threshold with a `string` (and not with a `number`) so for
  // example when hitting backspace after `0.01`, you get `0.0` (and not `0`).
  const [overlapThreshold, setOverlapThreshold] = React.useState(
    classOverlap.overlapThreshold === undefined
      ? undefined
      : String(classOverlap.overlapThreshold)
  );

  const setQuery = React.useCallback(
    (newClassOverlap: QueryClassOverlapState) =>
      history.push(
        `/${jobId}/class_analysis${constructSearchString({
          ...pipeline,
          ...classOverlap,
          ...newClassOverlap,
        })}`
      ),
    [history, jobId, pipeline, classOverlap]
  );

  const setQueryDebounced = useDebounced(setQuery);

  const checkValid = data?.plot.data[0].node.x.length > 0;

  return (
    <Box height="100%" width="100%" minHeight={0} position="relative">
      <Box paddingX={4} paddingTop={1} paddingBottom={3}>
        <Typography variant="h2">Class Analysis</Typography>
        {classAnalysisDescription}
      </Box>
      {error && (
        <Box
          alignItems="center"
          display="flex"
          flexDirection="column"
          gap={4}
          height="100%"
          justifyContent="center"
        >
          <img src={noData} alt="No overlap data" height="50%" />
          <Typography>{error.message}</Typography>
        </Box>
      )}
      {data && (
        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "auto",
            padding: 4,
          }}
        >
          <Box padding={2}>
            <Typography variant="h4">Class Overlap in Training Data</Typography>
            <Description text="Assess magnitude of overlap. Flows between class nodes indicate whether a class's utterances (source; left) are in neighborhoods typified by other classes or its own class (target; right)." />
          </Box>
          <Box display="flex" gap={4} alignSelf="center">
            <Box width={700}>
              {checkValid ? (
                <PlotWrapper {...data.plot} />
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignSelf="flex-start"
                >
                  <Typography
                    variant="h4"
                    alignSelf="flex-end"
                    paddingBottom={2}
                  >
                    No data for the threshold - {classOverlap?.overlapThreshold}
                  </Typography>
                  <img
                    src={noData}
                    alt="No data for the threshold"
                    height="10%"
                  />
                </Box>
              )}
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              paddingTop={5}
              paddingX={4}
              gap={2}
              alignItems="flex-start"
            >
              <FormGroup>
                <Tooltip
                  title="Show flow from a class to itself (not defined as overlap)."
                  arrow
                  placement="right"
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={classOverlap.selfOverlap ?? false}
                        color="secondary"
                        onChange={(_, checked) => {
                          setQuery({ selfOverlap: checked || undefined });
                        }}
                      />
                    }
                    label="Self-Overlap"
                  />
                </Tooltip>
                <Tooltip
                  title="Scale flow by class size. Otherwise, total flow is normalized within classes."
                  arrow
                  placement="right"
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={classOverlap.scaleByClass ?? true}
                        color="secondary"
                        onChange={(_, checked) => {
                          setQuery({ scaleByClass: checked && undefined });
                        }}
                      />
                    }
                    label="Scale By Class"
                  />
                </Tooltip>
              </FormGroup>
              <Tooltip
                title="Only flows with values above this threshold will be plotted."
                arrow
                placement="right"
              >
                <Typography variant="h4">Overlap Threshold</Typography>
              </Tooltip>
              <Box
                display="flex"
                flexDirection="row"
                alignItems="center"
                gap={1}
              >
                <Slider
                  track="inverted"
                  sx={{
                    width: 150,
                    marginX: "10px",
                    "& .MuiSlider-track": { border: "none" }, // compensate bug with track="inverted"
                  }}
                  {...OVERLAP_THRESHOLD_INPUT_PROPS}
                  value={Number(
                    overlapThreshold ?? data.defaultOverlapThreshold
                  )}
                  onChange={(_, value) => {
                    if (value !== Number(overlapThreshold)) {
                      setOverlapThreshold(String(value));
                    }
                  }}
                  onChangeCommitted={(_, value) => {
                    if (value !== classOverlap?.overlapThreshold) {
                      setQuery({ overlapThreshold: value as number });
                      setQueryDebounced.clear();
                    }
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  value={overlapThreshold ?? data.defaultOverlapThreshold}
                  inputProps={OVERLAP_THRESHOLD_INPUT_PROPS}
                  onChange={({ target: { value } }) => {
                    setOverlapThreshold(value);
                    setQueryDebounced({ overlapThreshold: Number(value) });
                  }}
                />
                <Tooltip title="Reset threshold" arrow>
                  <span>
                    <IconButton
                      aria-label="delete"
                      color="secondary"
                      disabled={classOverlap.overlapThreshold === undefined}
                      onClick={() => {
                        setOverlapThreshold(undefined);
                        setQuery({ overlapThreshold: undefined });
                        setQueryDebounced.clear();
                      }}
                    >
                      <RestartAltIcon fontSize="large" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      {isFetching && (
        <Box position="absolute" top={0} width="100%" height="100%">
          <Loading />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(ClassOverlap);
