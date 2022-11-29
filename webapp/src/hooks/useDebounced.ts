import { debounce } from "@mui/material";
import React from "react";

export default function useDebounced<T extends (...args: any[]) => any>(
  func: T,
  ms: number = 500
) {
  const setQueryDebounced = React.useMemo(() => debounce(func, ms), [func, ms]);

  // Cancel debounced execution when the component unmounts,
  // for example when navigating to another page while continuously typing.
  React.useEffect(() => setQueryDebounced.clear, [setQueryDebounced]);

  return setQueryDebounced;
}
