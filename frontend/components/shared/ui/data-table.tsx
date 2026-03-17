"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/shared/ui/skeleton";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | null;
  getRowId?: (row: TData) => string;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 6,
  onRowClick,
  selectedRowId,
  getRowId,
  columnFilters,
  onColumnFiltersChange,
  rowSelection,
  onRowSelectionChange,
  emptyState,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<ColumnFiltersState>([]);
  const [internalSelection, setInternalSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters: columnFilters ?? internalFilters,
      rowSelection: rowSelection ?? internalSelection,
    },
    getRowId,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalFilters,
    onRowSelectionChange: onRowSelectionChange ?? setInternalSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted/60 border-b px-4 py-2.5 flex gap-4">
            {columns.map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="border-b last:border-b-0 px-4 py-3 flex gap-4">
              {columns.map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-start font-medium text-muted-foreground whitespace-nowrap"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                {emptyState ?? "No results."}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const rowId = getRowId ? getRowId(row.original) : row.id;
              const isSelected = selectedRowId === rowId;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/40",
                    isSelected && "bg-primary/5 hover:bg-primary/8",
                    row.getIsSelected() && "bg-muted/30"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
