import { Table as ExternalTable } from '@mantine/core';
import {
  CellContext,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable,
  createColumnHelper as _createColumnHelper,
  ColumnDefTemplate,
} from '@tanstack/react-table';
import React, { useMemo } from 'react';
import { CoreProps } from '../../types';

import classes from './Table.styles';

export type IRow<TRow extends object = {}> = Row<TRow>;

/** Component used to render the contents of a cell */
export type CellRendererComponent<TRow, TCellValue> = ColumnDefTemplate<CellContext<TRow, TCellValue>>;

/** Helper for type-safe column definitions */
export const createColumnHelper = _createColumnHelper;

export interface ITableProps<TRow extends object> extends CoreProps {
  columns?: any[];
  data?: TRow[];
  isLoading?: boolean;
  pagination?: any;
  noDataPlaceholder?: React.ReactNode;
  loadingItems?: number;
  hasMore?: boolean;
  onRowClick?: (row: Row<TRow>) => void;
  onRowSelect?: (row: Row<TRow>) => void;
}

/**
 * Table component
 *
 */
export function Table<TRow extends object>({
  columns: userColumns,
  data: userData,
  isLoading = false,
  noDataPlaceholder,
  loadingItems = 10,
  onRowClick,
  onRowSelect,
  ...props
}: ITableProps<TRow>) {
  const columns = useMemo(() => userColumns?.map((col) => ({ ...col })), [userColumns]);
  const data = useMemo(() => (userData || [])?.map((row) => ({ ...row })), [userData]);
  const fakeData = useMemo(() => Array.from({ length: loadingItems }).map((_, index) => ({ index })), [loadingItems]);

  const table = useReactTable<TRow>({
    columns,
    data: isLoading ? (fakeData as TRow[]) : data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <ExternalTable classNames={classes} highlightOnHover {...props}>
      <thead>
        {table.getHeaderGroups().map((headerGroup, i) => {
          return (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>;
              })}
            </tr>
          );
        })}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => {
          return (
            <tr
              key={row.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoading && onRowClick) {
                  onRowClick(row);
                }
              }}
              className={classes.tr}
              data-disabled={isLoading || !onRowClick}
            >
              {row.getVisibleCells().map((cell) => {
                return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </ExternalTable>
  );
}
