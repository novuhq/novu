import { ITableProps, Table } from './Table';
type IPaginatedTableProps<T extends Record<string, unknown>> = Omit<ITableProps<T>, 'pagination'>;

export function PaginatedTable<T extends Record<string, unknown>>(props: IPaginatedTableProps<T>) {
  return (
    <>
      <Table {...props} />
    </>
  );
}
