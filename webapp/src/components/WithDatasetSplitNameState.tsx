import React from "react";
import { DatasetSplitName } from "types/api";

const WithDatasetSplitNameState: React.FC<{
  defaultDatasetSplitName: DatasetSplitName;
  render: (
    datasetSplitName: DatasetSplitName,
    setDatasetSplitName: (name: DatasetSplitName) => void
  ) => React.ReactElement;
}> = ({ defaultDatasetSplitName, render }) => {
  const [datasetSplitName, setDatasetSplitName] =
    React.useState<DatasetSplitName>(defaultDatasetSplitName);

  return render(datasetSplitName, setDatasetSplitName);
};

export default React.memo(WithDatasetSplitNameState);
