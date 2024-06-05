import { Table as ExternalTable } from '@mantine/core';
import { flexRender, getCoreRowModel, Row, useReactTable } from '@tanstack/react-table';
import React, { useMemo } from 'react';
import { CoreProps } from 'src/types';

import classes from './Table.styles';

export type IRow<T extends object = {}> = Row<T>;

export interface ITableProps<T extends object> extends CoreProps {
  columns?: any[];
  data?: T[];
  isLoading?: boolean;
  pagination?: any;
  noDataPlaceholder?: React.ReactNode;
  loadingItems?: number;
  hasMore?: boolean;
  onRowClick?: (row: Row<T>) => void;
  onRowSelect?: (row: Row<T>) => void;
}

/**
 * Table component
 *
 */
export function Table<T extends object>({
  columns: userColumns,
  data: userData,
  isLoading = false,
  noDataPlaceholder,
  loadingItems = 10,
  onRowClick,
  onRowSelect,
  ...props
}: ITableProps<T>) {
  const columns = useMemo(() => userColumns?.map((col) => ({ ...col })), [userColumns]);
  const data = useMemo(() => (userData || [])?.map((row) => ({ ...row })), [userData]);
  const fakeData = useMemo(() => Array.from({ length: loadingItems }).map((_, index) => ({ index })), [loadingItems]);

  const table = useReactTable<T>({
    columns,
    data: isLoading ? (fakeData as T[]) : data,
    getCoreRowModel: getCoreRowModel(),
    // FIXME: remove this
    debugTable: true,
  });

  return (
    <ExternalTable classNames={classes} highlightOnHover {...props}>
      <thead>
        {table.getHeaderGroups().map((headerGroup, i) => {
          return (
            <tr key={headerGroup.id} {...headerGroup}>
              {headerGroup.headers.map((header) => {
                return (
                  <th key={header.id} {...header}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
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
              {...row}
              className={classes.tr}
              data-disabled={isLoading || !onRowClick}
            >
              {row.getVisibleCells().map((cell) => {
                return (
                  <td key={cell.id} {...cell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </ExternalTable>
  );
}
