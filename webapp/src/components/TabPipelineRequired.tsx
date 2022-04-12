import { Tab, Tooltip } from "@mui/material";
import React from "react";
import { QueryPipelineState } from "types/models";
import { PIPELINE_REQUIRED_TIP } from "utils/const";
import { isPipelineSelected } from "utils/helpers";

interface Props extends React.ComponentProps<typeof Tab> {
  pipeline: QueryPipelineState;
}

const TabPipelineRequired = ({ pipeline, ...props }: Props) =>
  isPipelineSelected(pipeline) ? (
    <Tab {...props} />
  ) : (
    <Tooltip title={PIPELINE_REQUIRED_TIP}>
      {/* A disabled element does not trigger user interactions, so let's wrap it */}
      <span>
        <Tab {...props} disabled />
      </span>
    </Tooltip>
  );

export default React.memo(TabPipelineRequired);
