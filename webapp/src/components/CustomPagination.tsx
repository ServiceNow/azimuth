import {
  gridPaginationSelector,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid";
import { Pagination } from "@mui/material";

const CustomPagination = () => {
  const apiRef = useGridApiContext();
  const paginationState = useGridSelector(apiRef, gridPaginationSelector);
  return (
    <Pagination
      color="primary"
      count={paginationState.pageCount}
      page={paginationState.page + 1}
      onChange={(_, value) => apiRef.current.setPage(value - 1)}
    />
  );
};

export default CustomPagination;
