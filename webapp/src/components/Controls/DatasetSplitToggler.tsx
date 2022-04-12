import React from "react";
import { useParams } from "react-router-dom";
import { getDatasetInfoEndpoint } from "services/api";
import { DatasetSplitName } from "types/api";
import { DATASET_SPLIT_NAMES, DATASET_SPLIT_PRETTY_NAMES } from "utils/const";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";

type Props = {
  value: DatasetSplitName;
  onChange: (value: DatasetSplitName) => void;
};

const DatasetSplitToggler: React.FC<Props> = ({ value, onChange }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: datasetInfo } = getDatasetInfoEndpoint.useQuery({ jobId });

  const handleSelectionChange = (newValue: DatasetSplitName | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      color="secondary"
      exclusive
      fullWidth
      size="small"
      value={value}
      onChange={(_, value) => handleSelectionChange(value)}
    >
      {DATASET_SPLIT_NAMES.map((datasetSplitName) => (
        <ToggleButton
          key={datasetSplitName}
          sx={{ gap: 1, whiteSpace: "nowrap" }}
          value={datasetSplitName}
          disabled={!datasetInfo?.availableDatasetSplits[datasetSplitName]}
        >
          {datasetSplitName === "eval" && <SpeedIcon />}
          {datasetSplitName === "train" && <ModelTrainingIcon />}
          {DATASET_SPLIT_PRETTY_NAMES[datasetSplitName]} Set
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default React.memo(DatasetSplitToggler);
