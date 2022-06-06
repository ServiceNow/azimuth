import {
  DataGrid,
  DataGridProps,
  GridCellValue,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowProps,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import CustomPagination from "components/CustomPagination";
import React from "react";
import { PAGE_SIZE } from "utils/const";

// A raw object is fine, but the type `object` also accepts an array, and that results in a console.error at runtime.
type CellValue = Exclude<GridCellValue, object> | { [field: string]: unknown };

// The wrapper { [Field in keyof Row]: <...> }[keyof Row]
// is hacking the Mapped Type syntax to generate all possibilities of keyof Row.
export type ColumnWithFieldKeyof<Row> = Omit<
  GridColDef,
  "renderCell" | "valueGetter"
> &
  {
    [Field in keyof Row]: Row[Field] extends CellValue
      ? {
          field: Field;
          renderCell?: (
            params: GridRenderCellParams<Row[Field], Row>
          ) => React.ReactNode;
        }
      : never;
  }[keyof Row];

// If field is not a keyof Row, we require renderCell or valueGetter.
export type ColumnWithAnyField<Row> = Omit<
  GridColDef,
  "renderCell" | "valueGetter"
> &
  (
    | {
        renderCell: (
          params: GridRenderCellParams<undefined, Row>
        ) => React.ReactNode;
      }
    | {
        valueGetter: (
          params: GridValueGetterParams<undefined, Row>
        ) => CellValue;
      }
  );

export type Column<Row> = ColumnWithFieldKeyof<Row> | ColumnWithAnyField<Row>;

export interface RowProps<Row> extends GridRowProps {
  row: Row;
}

// The DataGrid typing is pretty weak.
// We enforce some cohesion between the rows and columns ourselves.
export interface Props<Row> extends DataGridProps {
  rows: Row[];
  columns: Column<Row>[];
}

export const Table = <Row extends { id: GridRowId }>({
  components,
  sx,
  ...props
}: Props<Row>) => (
  <DataGrid
    disableColumnMenu
    disableSelectionOnClick
    hideFooter={!props.pagination && !components?.Footer}
    rowHeight={64}
    pageSize={props.pagination && PAGE_SIZE}
    components={{
      ...(props.pagination && { Pagination: CustomPagination }),
      ...components,
    }}
    sx={{
      border: "none",
      "& .MuiDataGrid-cell:focus, .MuiDataGrid-cell:focus-within, .MuiDataGrid-columnHeader:focus, .MuiDataGrid-columnHeader:focus-within":
        {
          outline: "none",
        },
      "& .MuiDataGrid-columnHeaderTitle, .MuiDataGrid-columnHeader": {
        fontWeight: "bold",
      },
      ...sx,
    }}
    {...props}
  />
);
