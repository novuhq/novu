import React, { useEffect } from 'react';
import { TableProps, Table as MantineTable, LoadingOverlay, Pagination } from '@mantine/core';
import styled from '@emotion/styled';
import {
  useTable,
  Column,
  ColumnWithStrictAccessor,
  usePagination,
  TableInstance,
  UsePaginationInstanceProps,
  UsePaginationState,
} from 'react-table';

import useStyles from './Table.styles';
import { colors } from '../config';

const NoDataPlaceholder = styled.div`
  padding: 0 30px;
  flex: 1;
`;

export type Data = Record<string, any>;

export interface ITableProps {
  columns?: ColumnWithStrictAccessor<Data>[];
  data?: Data[];
  loading?: boolean;
  pagination?: any;
  onRowClick?: (row: Data) => void;
  noDataPlaceholder?: React.ReactNode;
}

type UseTableProps = UsePaginationInstanceProps<Data> &
  TableInstance<Data> & {
    state: UsePaginationState<Data>;
  };

/**
 * Table component
 *
 */
export function Table({
  columns: userColumns,
  data: userData,
  pagination = false,
  loading = false,
  onRowClick,
  noDataPlaceholder,
  ...props
}: ITableProps) {
  const { pageSize, total, onPageChange, current } = pagination;

  const columns = React.useMemo(
    () =>
      userColumns?.map((col) => {
        const column = {
          Header: col.Header,
          accessor: col.accessor,
          width: col.width,
          maxWidth: col.maxWidth,
        };
        if (col?.Cell) {
          return {
            ...column,
            /**
             * Due to an issue with the Column accessor interface from react-table
             * We decided to ignore the Cell type for now.
             */
            // eslint-disable-next-line
            Cell: ({ row }) => (col?.Cell ? (col?.Cell as any)(row.original) : null),
          };
        }

        return column;
      }) as Column<Data>[],
    [userColumns]
  );

  const data = React.useMemo(() => (userData || [])?.map((row) => ({ ...row })) as Data[], [userData]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows: allRows,
    prepareRow,
    page,
    gotoPage,
    state: { pageIndex },
  } = useTable(
    {
      columns,
      data,
      ...(pagination
        ? {
            initialState: { pageIndex: current, pageSize },
            manualPagination: true,
            pageCount: Math.ceil(total / pageSize),
          }
        : {}),
    } as any,
    usePagination
  ) as UseTableProps;

  useEffect(() => {
    if (onPageChange) {
      onPageChange(pageIndex);
    }
  }, [pageIndex]);

  const handlePageChange = (pageNumber) => {
    gotoPage(pageNumber - 1);
  };
  const getPageCount = () => {
    return Math.ceil(total / pageSize);
  };

  const { classes, theme } = useStyles();
  const defaultDesign = { verticalSpacing: 'sm', horizontalSpacing: 'sm', highlightOnHover: true } as TableProps;
  const rows = pagination ? page : allRows;
  const noData = rows.length === 0;

  return (
    <div style={{ position: 'relative', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
      <LoadingOverlay
        visible={loading}
        zIndex={1}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />

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
                onClick={() => (onRowClick ? onRowClick(row) : null)}
                {...row.getRowProps()}
                className={classes.tableRow}
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
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </MantineTable>
      {!loading && noData && noDataPlaceholder && <NoDataPlaceholder>{noDataPlaceholder}</NoDataPlaceholder>}
      {pagination && total > 0 && pageSize > 1 && getPageCount() > 1 && (
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
    </div>
  );
}
