import React from "react";

import { useLocation } from "react-router-dom";
import { parseSearchString } from "utils/helpers";

function useQueryState() {
  const location = useLocation();
  const searchString = location.search;

  return React.useMemo(
    () => ({ ...parseSearchString(searchString), searchString }),
    [searchString]
  );
}

export default useQueryState;
