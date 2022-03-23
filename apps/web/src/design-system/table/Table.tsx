import React from 'react';
import { TableProps, Table as MantineTable, LoadingOverlay } from '@mantine/core';
import { useTable, Column, ColumnWithStrictAccessor } from 'react-table';
import useStyles from './Table.styles';
import { colors } from '../config';

export type Data = Record<string, any>;

export interface ITableProps extends JSX.ElementChildrenAttribute {
  columns?: ColumnWithStrictAccessor<Data>[];
  data?: Data[];
  loading?: boolean;
  onRowClick?: (row: Data) => void;
}

/**
 * Table component
 *
 */
export function Table({
  columns: userColumns,
  data: userData,
  loading = false,
  children,
  onRowClick,
  ...props
}: ITableProps) {
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

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns, data });

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
          {rows.map((row) => {
            prepareRow(row);

            return (
              <tr
                onClick={() => (onRowClick ? onRowClick(row) : null)}
                {...row.getRowProps()}
                className={classes.tableRow}>
                {row.cells.map((cell) => {
                  return (
                    <td
                      {...cell.getCellProps({
                        style: {
                          maxWidth: cell.column.maxWidth,
                          width: cell.column.width,
                        },
                      })}>
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </MantineTable>
    </div>
  );
}
