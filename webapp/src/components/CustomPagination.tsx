import makeStyles from "@mui/styles/makeStyles";
import {
  gridPaginationSelector,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid";
import { Pagination } from "@mui/material";

const useStyles = makeStyles(() => ({
  pagination: {
    display: "flex",
  },
}));

const CustomPagination = () => {
  const classes = useStyles();
  const apiRef = useGridApiContext();
  const paginationState = useGridSelector(apiRef, gridPaginationSelector);
  return (
    <Pagination
      className={classes.pagination}
      color="primary"
      count={paginationState.pageCount}
      page={paginationState.page + 1}
      onChange={(_, value) => apiRef.current.setPage(value - 1)}
    />
  );
};

export default CustomPagination;
