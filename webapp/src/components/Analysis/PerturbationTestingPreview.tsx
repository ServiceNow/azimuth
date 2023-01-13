import { Paper, Typography } from "@mui/material";
import {
  perturbationTestingFailureRateColumns,
  perturbationTestingSummaryPreviewColumns,
} from "components/PerturbationTestingSummary/PerturbationTestingSummaryTable";
import { ColumnWithFieldKeyof, Table } from "components/Table";
import { getPerturbationTestingSummaryEndpoint } from "services/api";
import { AvailableDatasetSplits, PerturbationTestSummary } from "types/api";
import { QueryPipelineState } from "types/models";
import { DATASET_SPLIT_NAMES, DATASET_SPLIT_PRETTY_NAMES } from "utils/const";
import { formatRatioAsPercentageString } from "utils/format";
import PreviewToggle from "./PreviewToggle";
import PreviewToggleButton from "./PreviewToggleButton";

type Row = PerturbationTestSummary & { id: number; failureRate: number };

const PerturbationTestingPreview: React.FC<{
  jobId: string;
  pipeline: Required<QueryPipelineState>;
  availableDatasetSplits: AvailableDatasetSplits;
}> = ({ jobId, pipeline, availableDatasetSplits }) => {
  const { data, error, isError, isFetching } =
    getPerturbationTestingSummaryEndpoint.useQuery({ jobId, ...pipeline });

  const defaultOption = DATASET_SPLIT_NAMES.findIndex(
    (datasetSplitName) => availableDatasetSplits[datasetSplitName]
  );

  return (
    <PreviewToggle
      defaultOption={defaultOption}
      options={DATASET_SPLIT_NAMES.map((name, i) => ({
        button: (
          <PreviewToggleButton
            key={i}
            value={i}
            disabled={!availableDatasetSplits[name]}
            isError={isError}
            isFetching={isFetching}
          >
            <Typography
              variant="h2"
              fontWeight="bold"
              color={
                data && availableDatasetSplits[name]
                  ? (theme) =>
                      theme.palette[
                        data.failureRates[name] ? "warning" : "success"
                      ].main
                  : undefined
              }
            >
              {
                data && availableDatasetSplits[name]
                  ? formatRatioAsPercentageString(data.failureRates[name], 1)
                  : "--%" // Visible when disabled, approx width for skeleton
              }
            </Typography>
            <Typography>
              Failure rate - {DATASET_SPLIT_PRETTY_NAMES[name]} Set
            </Typography>
          </PreviewToggleButton>
        ),
        content: (
          <Paper variant="outlined" sx={{ height: "100%", padding: 4 }}>
            <Table
              // Renaming `${name}FailureRate` to `failureRate` so that the two
              // tables share the same column definitions and sort model.
              // Since the two tables are defined (even though not directly) in
              // an array, React doesn't make the difference between them. When
              // toggling from one to the other, React renders it as the same
              // table. Since the `${name}FailureRate` column doesn't exist in
              // the other table, we would get an undesired sortModel change
              // event.
              // About other solutions:
              // Redefining a valueGetter based on the dataset split is not
              // enough. When toggling, we have to redefine the rows, otherwise
              // the they don't seem to be resorted.
              // Alternatively, it works to separate the two tables by setting a
              // key={name}
              // However, this solution doesn't preserve the sort model across
              // toggling from one dataset split to the other.
              loading={isFetching}
              rows={
                data?.allTestsSummary?.map((test, id) => ({
                  id,
                  failureRate: test[`${name}FailureRate`],
                  ...test,
                })) || []
              }
              columns={[
                ...perturbationTestingSummaryPreviewColumns,
                {
                  ...perturbationTestingFailureRateColumns[i],
                  field: "failureRate",
                } as ColumnWithFieldKeyof<Row>,
              ]}
              error={error}
              initialState={{
                sorting: {
                  sortModel: [{ field: `failureRate`, sort: "desc" }],
                },
              }}
            />
          </Paper>
        ),
      }))}
    />
  );
};

export default PerturbationTestingPreview;
