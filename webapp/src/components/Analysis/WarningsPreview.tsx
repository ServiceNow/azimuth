import { Paper, Typography } from "@mui/material";
import Loading from "components/Loading";
import { WarningPlot } from "components/PlotWrapper";
import React from "react";
import { getDatasetWarningsEndpoint } from "services/api";
import { DatasetWarning } from "types/api";
import PreviewToggle from "./PreviewToggle";
import PreviewToggleButton from "./PreviewToggleButton";

const WarningsPreview: React.FC<{ jobId: string }> = ({ jobId }) => {
  const {
    data: datasetWarningGroups,
    error,
    isError,
    isFetching,
  } = getDatasetWarningsEndpoint.useQuery({ jobId });

  const warnings = React.useMemo<(DatasetWarning | undefined)[]>(
    () =>
      datasetWarningGroups?.flatMap(({ warnings }) => warnings) ||
      Array.from(Array(3), () => undefined),
    [datasetWarningGroups]
  );

  return (
    <PreviewToggle
      options={warnings.map((warning, i) => ({
        button: (
          <PreviewToggleButton
            key={i}
            value={i}
            isError={isError}
            isFetching={isFetching}
          >
            <Typography>
              <Typography
                component="span"
                variant="h2"
                fontWeight="bold"
                color={(theme) =>
                  warning &&
                  theme.palette[
                    warning.comparisons.some(({ alert }) => alert)
                      ? "warning"
                      : "success"
                  ].main
                }
              >
                {warning?.comparisons.filter(({ alert }) => alert).length ?? 0}
              </Typography>
              <Typography component="span">
                {` classes out of ${warning?.comparisons.length ?? 0}`}
              </Typography>
            </Typography>
            <Typography>
              {warning?.name ?? "Approx width for skeleton"}
            </Typography>
          </PreviewToggleButton>
        ),
        content: (
          <Paper
            variant="outlined"
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              overflow: "scroll",
            }}
          >
            {isFetching ? (
              <Loading />
            ) : warning ? (
              <WarningPlot warning={warning} />
            ) : (
              <Typography variant="body2" margin={2} alignSelf="center">
                {error?.message}
              </Typography>
            )}
          </Paper>
        ),
      }))}
    />
  );
};

export default WarningsPreview;
