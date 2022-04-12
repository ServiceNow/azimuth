import React from "react";

import { useLocation } from "react-router-dom";
import {
  convertSearchParamsToFilterState,
  convertSearchParamsToPaginationState,
  convertSearchParamsToPipelineState,
} from "utils/helpers";

function useQueryState() {
  const location = useLocation();
  const searchString = location.search;

  return React.useMemo(() => {
    const q = new URLSearchParams(searchString);
    return {
      filters: convertSearchParamsToFilterState(q),
      pagination: convertSearchParamsToPaginationState(q),
      pipeline: convertSearchParamsToPipelineState(q),
      searchString,
    };
  }, [searchString]);
}

export default useQueryState;
