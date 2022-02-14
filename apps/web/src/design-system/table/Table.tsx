import React from 'react';
import { TableProps, Table as MantineTable } from '@mantine/core';
import { useTable } from 'react-table';
import useStyles from './Table.styles';

interface ITableProps extends JSX.ElementChildrenAttribute {
  columns?: any;
  data?: any;
}

/**
 * Table component
 *
 */
export function Table({ columns: userColumns, data: userData, children, ...props }: ITableProps) {
  const columns = React.useMemo(
    () =>
      userColumns.map((col) => {
        const column = {
          Header: col.Header,
          accessor: col.accessor,
        };
        if (col.Cell) {
          return {
            ...column,
            Cell: ({ row }) => col.Cell(row.original),
          };
        }
        return column;
      }),
    []
  );

  const data = React.useMemo(() => userData.map((row) => ({ ...row })), []);

  const tableInstance = useTable({ columns, data });

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

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
