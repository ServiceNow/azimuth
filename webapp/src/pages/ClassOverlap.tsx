import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Typography,
  Box,
  Slider,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip,
  FormGroup,
  IconButton,
  TextField,
} from "@mui/material";
import noData from "assets/void.svg";
import Description from "components/Description";
import Loading from "components/Loading";
import { PlotWrapper } from "components/PlotWrapper";
import useQueryState from "hooks/useQueryState";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { getClassOverlapPlotEndpoint } from "services/api";
import { QueryClassOverlapState } from "types/models";
import { constructSearchString } from "utils/helpers";

const OVERLAP_THRESHOLD_INPUT_PROPS = { step: 0.01, min: 0, max: 1 };

const ClassOverlap = () => {
  const history = useHistory();
  const { jobId } = useParams<{ jobId: string }>();
  const { classOverlap, pipeline } = useQueryState();

  const { data, error, isFetching } = getClassOverlapPlotEndpoint.useQuery({
    jobId,
    ...classOverlap,
  });

  const [overlapThreshold, setOverlapThreshold] = React.useState(
    classOverlap.overlapThreshold
  );

  React.useEffect(
    () => setOverlapThreshold(classOverlap.overlapThreshold),
    [classOverlap.overlapThreshold]
  );

  const setQuery = (newClassOverlap: QueryClassOverlapState) =>
    history.push(
      `/${jobId}/class_overlap${constructSearchString({
        ...pipeline,
        ...classOverlap,
        ...newClassOverlap,
      })}`
    );

  const checkValid = data?.plot.data[0].node.x.length > 0;

  return (
    <Box height="100%" width="100%" minHeight={0} position="relative">
      <Box paddingX={4} paddingTop={1} paddingBottom={3}>
        <Typography variant="h2">Class Overlap</Typography>
        {
          <Description
            text="Assess semantic overlap between class pairs."
            link="/class-overlap/"
          />
        }
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
            <Typography variant="h4">
              Semantic Overlap in Training Data
            </Typography>
            <Description
              text={
                "Assess magnitude of overlap and select class pairs to explore further. For suggested workflow:"
              }
              link="/class-overlap/"
            />
            <Typography variant="body2" marginTop={0.25}>
              Flows between class nodes indicate whether a source class's
              utterances are in neighborhoods typified by other classes (class
              overlap) or its own class (self-overlap). For each source class,
              class overlap and self-overlap flows sum to 1, unless total flow
              is scaled by class size. Greatest class overlap is towards the
              top. Colors group flows from the same source class.
            </Typography>
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
                  title="Show flows for overlap of a class with itself, to compare to class overlap. Samples can overlap samples in other classes (class overlap) or within the same class (self-overlap)."
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
                  title="Scale flows by class size. Otherwise, total flow is normalized within classes (self-overlap + class overlap = 1)."
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
                title="Only overlap values above this threshold will be plotted. Vary this value to see all dataset overlap or to focus on greatest overlap."
                arrow
                placement="right"
              >
                <Typography variant="h4">
                  Minimum displayed overlap value
                </Typography>
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
                  value={overlapThreshold ?? data.defaultOverlapThreshold}
                  onChange={(_, value) => {
                    if (value !== overlapThreshold) {
                      setOverlapThreshold(value as number);
                    }
                  }}
                  onChangeCommitted={(_, value) => {
                    if (value !== classOverlap?.overlapThreshold) {
                      setQuery({ overlapThreshold: value as number });
                    }
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  value={overlapThreshold ?? data.defaultOverlapThreshold}
                  inputProps={OVERLAP_THRESHOLD_INPUT_PROPS}
                  onChange={(event) => {
                    setQuery({ overlapThreshold: Number(event.target.value) });
                  }}
                />
                <Tooltip title="Reset threshold (10th highest overlap)" arrow>
                  <span>
                    <IconButton
                      aria-label="delete"
                      color="secondary"
                      disabled={classOverlap.overlapThreshold === undefined}
                      onClick={() => {
                        setQuery({ overlapThreshold: undefined });
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
