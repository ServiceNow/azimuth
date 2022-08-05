import React from "react";
import { AvailableDatasetSplits, DatasetSplitName } from "types/api";
import { DATASET_SPLIT_NAMES, DATASET_SPLIT_PRETTY_NAMES } from "utils/const";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";

type Props = {
  availableDatasetSplits: AvailableDatasetSplits | undefined;
  value: DatasetSplitName;
  onChange: (value: DatasetSplitName) => void;
};

const DatasetSplitToggler: React.FC<Props> = ({
  availableDatasetSplits,
  value,
  onChange,
}) => (
  <ToggleButtonGroup
    color="secondary"
    exclusive
    fullWidth
    size="small"
    value={value}
    onChange={(_, value: DatasetSplitName | null) => value && onChange(value)}
  >
    {DATASET_SPLIT_NAMES.map((datasetSplitName) => (
      <ToggleButton
        key={datasetSplitName}
        sx={{ gap: 1, whiteSpace: "nowrap" }}
        value={datasetSplitName}
        disabled={!availableDatasetSplits?.[datasetSplitName]}
      >
        {datasetSplitName === "eval" && <SpeedIcon />}
        {datasetSplitName === "train" && <ModelTrainingIcon />}
        {DATASET_SPLIT_PRETTY_NAMES[datasetSplitName]} Set
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

export default React.memo(DatasetSplitToggler);
