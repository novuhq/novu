import React from 'react';
import { TableProps, Table as MantineTable } from '@mantine/core';
import { useTable, Column, ColumnWithStrictAccessor } from 'react-table';
import useStyles from './Table.styles';

export type Data = Record<string, any>;

export interface ITableProps extends JSX.ElementChildrenAttribute {
  columns?: ColumnWithStrictAccessor<Data>[];
  data?: Data[];
}

/**
 * Table component
 *
 */
export function Table({ columns: userColumns, data: userData, children, ...props }: ITableProps) {
  const columns = React.useMemo(
    () =>
      userColumns?.map((col) => {
        const column = {
          Header: col.Header,
          accessor: col.accessor,
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
    []
  );

  const data = React.useMemo(() => userData?.map((row) => ({ ...row })) as Data[], []);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns, data });

  const { classes } = useStyles();
  const defaultDesign = { verticalSpacing: 'sm', horizontalSpacing: 'sm', highlightOnHover: true } as TableProps;

  return (
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
            <tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </MantineTable>
  );
}
