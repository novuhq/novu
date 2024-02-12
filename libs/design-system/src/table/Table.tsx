import React, { useEffect, useMemo } from 'react';
import { Skeleton, TableProps, Table as MantineTable, Pagination, Button } from '@mantine/core';
import styled from '@emotion/styled';
import {
  useTable,
  Column,
  usePagination,
  TableInstance,
  UsePaginationInstanceProps,
  UsePaginationState,
  Row,
  CellProps,
  IdType,
  useRowSelect,
  UseRowSelectInstanceProps,
  UseRowSelectState,
} from 'react-table';
import { useDataRef } from '@novu/shared-web';

import useStyles from './Table.styles';
import { colors } from '../config';
import { DefaultCell } from './DefaultCell';
import { ChevronLeft, ChevronRight } from '../icons';
import { Radio } from '../radio/Radio';

const NoDataPlaceholder = styled.div`
  padding: 0 30px;
  flex: 1;
`;

const RadioSkeleton = styled(Skeleton)`
  width: 20px;
  min-width: 20px;
  height: 20px;
  border-radius: 100%;
`;

export type IExtendedCellProps<T extends object = {}> = CellProps<T> & { isLoading: boolean };

export type IExtendedColumn<T extends object = {}> = Column<T> & {
  Cell?: (props: IExtendedCellProps<T>) => React.ReactNode;
};

export type IRow<T extends object = {}> = Row<T>;

const defaultColumn: Partial<IExtendedColumn> = {
  Cell: DefaultCell,
};

export interface ITableProps<T extends object> {
  columns?: IExtendedColumn<T>[];
  data?: T[];
  loading?: boolean;
  pagination?: any;
  noDataPlaceholder?: React.ReactNode;
  loadingItems?: number;
  hasMore?: boolean;
  minimalPagination?: boolean;
  withSelection?: boolean;
  withRowClickSelection?: boolean;
  initialSelectedRows?: Record<IdType<T>, boolean>;
  onRowClick?: (row: Row<T>) => void;
  onRowSelect?: (row: Row<T>) => void;
}

type UseTableProps<T extends object> = UsePaginationInstanceProps<T> &
  UseRowSelectInstanceProps<T> &
  TableInstance<T> & {
    state: UsePaginationState<T> & UseRowSelectState<T>;
  };

/**
 * Table component
 *
 */
export function Table<T extends object>({
  columns: userColumns,
  data: userData,
  pagination = false,
  loading = false,
  noDataPlaceholder,
  loadingItems = 10,
  withSelection = false,
  initialSelectedRows,
  onRowClick,
  onRowSelect,
  ...props
}: ITableProps<T>) {
  const { pageSize, total, onPageChange, current } = pagination;
  const columns = useMemo(() => userColumns?.map((col) => ({ ...col })), [userColumns]);
  const data = useMemo(() => (userData || [])?.map((row) => ({ ...row })), [userData]);
  const fakeData = useMemo(() => Array.from({ length: loadingItems }).map((_, index) => ({ index })), [loadingItems]);
  const onPageChangeRef = useDataRef(onPageChange);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows: allRows,
    prepareRow,
    page,
    gotoPage,
    toggleAllRowsSelected,
    state: { pageIndex },
  } = useTable(
    {
      columns,
      defaultColumn,
      data: loading ? fakeData : data,
      ...(pagination && !pagination?.minimalPagination
        ? {
            initialState: { pageIndex: current, pageSize },
            manualPagination: true,
            pageCount: Math.ceil(total / pageSize),
          }
        : {}),
      ...(withSelection && {
        autoResetSelectedRows: false,
        initialState: { selectedRowIds: initialSelectedRows ?? {} },
      }),
    } as any,
    usePagination,
    useRowSelect,
    (hooks) => {
      if (!withSelection) {
        return;
      }

      const selectionRow = {
        id: 'selection',
        Header: () => null,
        Cell: ({ row, isLoading }) => {
          if (isLoading) {
            return <RadioSkeleton />;
          }

          const { checked } = row.getToggleRowSelectedProps();

          return (
            <Radio
              checked={checked}
              onChange={(e) => {
                e.stopPropagation();

                toggleAllRowsSelected(false);
                row.toggleRowSelected(true);
                onRowSelect?.(row);
              }}
              size="sm"
              styles={{ radio: { margin: '0 !important', cursor: 'pointer' } }}
            />
          );
        },
        width: 30,
        maxWidth: 30,
      };
      hooks.visibleColumns.push((visibleColumns) => [selectionRow, ...visibleColumns]);
    }
  ) as unknown as UseTableProps<T>;

  useEffect(() => {
    onPageChangeRef.current?.(pageIndex);
  }, [onPageChangeRef, pageIndex]);

  const handlePageChange = (pageNumber) => {
    if (pagination?.minimalPagination) {
      onPageChange(pageNumber);
    } else {
      gotoPage(pageNumber - 1);
    }
  };
  const getPageCount = () => {
    return Math.ceil(total / pageSize);
  };

  const { classes } = useStyles({ withSelection });
  const defaultDesign = { verticalSpacing: 'sm', horizontalSpacing: 'sm', highlightOnHover: true } as TableProps;
  const rows = pagination ? page : allRows;
  const noData = rows.length === 0;

  return (
    <div style={{ position: 'relative', minHeight: 500, display: 'flex', flexDirection: 'column' }} data-table-holder>
      <MantineTable className={classes.root} {...defaultDesign} {...getTableProps()} {...props}>
        <thead>
          {headerGroups.map((headerGroup, i) => {
            return (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps()}>{column.render('Header')}</th>
                ))}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);

            return (
              <tr
                onClick={(e) => {
                  e.stopPropagation();
                  if (!loading && onRowClick) {
                    onRowClick(row);
                  }
                }}
                {...row.getRowProps()}
                className={classes.tableRow}
                data-disabled={loading || !onRowClick}
              >
                {row.cells.map((cell, i) => (
                  <td
                    {...cell.getCellProps({
                      style: {
                        maxWidth: cell.column.maxWidth,
                        width: cell.column.width,
                      },
                    })}
                  >
                    {cell.render('Cell', { isLoading: loading })}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </MantineTable>
      {!loading && noData && noDataPlaceholder && <NoDataPlaceholder>{noDataPlaceholder}</NoDataPlaceholder>}
      {!loading && pagination && total > 0 && pageSize > 1 && getPageCount() > 1 && !pagination?.minimalPagination && (
        <div style={{ marginTop: 'auto' }}>
          <Pagination
            styles={{
              item: {
                marginTop: '15px',
                marginBottom: '15px',
                backgroundColor: 'transparent',
                '&[data-active]': {
                  backgroundImage: colors.horizontal,
                  border: 'none',
                },
              },
            }}
            total={getPageCount()}
            page={pageIndex + 1}
            onChange={handlePageChange}
            position="center"
          />
        </div>
      )}

      {!loading && pagination && pageSize > 1 && pagination?.minimalPagination && (
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '15px',
          }}
        >
          <Button.Group>
            <Button
              variant="outline"
              disabled={pagination?.current === 0 || loading}
              onClick={() => handlePageChange(pagination?.current - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              loading={loading}
              variant="outline"
              disabled={!pagination?.hasMore || loading}
              onClick={() => handlePageChange(pagination?.current + 1)}
            >
              <ChevronRight />
            </Button>
          </Button.Group>
        </div>
      )}
    </div>
  );
}
