import { ArrowDropDown, Download } from "@mui/icons-material";
import { Button, Menu, MenuItem } from "@mui/material";
import React from "react";
import { QueryPipelineState } from "types/models";
import {
  downloadPerturbedSet,
  downloadPerturbationTestingSummary,
} from "utils/api";

type Props = {
  jobId: string;
  pipeline: Required<QueryPipelineState>;
};

const PerturbationTestingExporter: React.FC<Props> = ({ jobId, pipeline }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClickDownloadSummary = () => {
    downloadPerturbationTestingSummary({ jobId, ...pipeline });
    handleClose();
  };
  const handleClickDownloadPerturbedTestSet = () => {
    downloadPerturbedSet({ jobId, datasetSplitName: "eval", ...pipeline });
    handleClose();
  };
  const handleClickDownloadPerturbedTrainingSet = () => {
    downloadPerturbedSet({ jobId, datasetSplitName: "train", ...pipeline });
    handleClose();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        aria-controls="perturbation-testing-exporter-menu"
        aria-haspopup="true"
        onClick={handleClick}
        startIcon={<Download />}
        endIcon={<ArrowDropDown />}
      >
        Export
      </Button>
      <Menu
        id="perturbation-testing-exporter-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClickDownloadSummary}>
          Export behavioral testing summary
        </MenuItem>
        <MenuItem onClick={handleClickDownloadPerturbedTestSet}>
          Export modified evaluation set
        </MenuItem>
        <MenuItem onClick={handleClickDownloadPerturbedTrainingSet}>
          Export modified training set
        </MenuItem>
      </Menu>
    </>
  );
};

export default PerturbationTestingExporter;
