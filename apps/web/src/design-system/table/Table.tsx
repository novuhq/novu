import React, { useEffect } from 'react';
import { TableProps, Table as MantineTable, LoadingOverlay, Pagination } from '@mantine/core';
import { useTable, Column, ColumnWithStrictAccessor, usePagination } from 'react-table';

import useStyles from './Table.styles';
import { colors } from '../config';

export type Data = Record<string, any>;

export interface ITableProps {
  columns?: ColumnWithStrictAccessor<Data>[];
  data?: Data[];
  loading?: boolean;
  pagination?: any;
  onRowClick?: (row: Data) => void;
}

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
    rows,
    prepareRow,
    page,
    gotoPage,
    state: { pageIndex },
  }: any = useTable(
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
  );

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

  return (
    <div style={{ position: 'relative', minHeight: 500 }}>
      <LoadingOverlay
        visible={loading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />

      <MantineTable className={classes.root} {...defaultDesign} {...getTableProps()} {...props}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {(pagination ? page : rows).map((row) => {
            prepareRow(row);

            return (
              <tr
                onClick={() => (onRowClick ? onRowClick(row) : null)}
                {...row.getRowProps()}
                className={classes.tableRow}
              >
                {row.cells.map((cell) => {
                  return (
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
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </MantineTable>
      {pagination && total > 0 && pageSize > 1 && getPageCount() > 1 && (
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
      )}
    </div>
  );
}
