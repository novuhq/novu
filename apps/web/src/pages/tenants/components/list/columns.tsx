import { format } from 'date-fns';

import { ITenantEntity } from '@novu/shared';
import { IExtendedColumn, Tooltip, withCellLoading, Text } from '@novu/design-system';

const maxWidth = 60;

export const columns: IExtendedColumn<ITenantEntity>[] = [
  {
    accessor: 'name',
    Header: 'Name',
    Cell: withCellLoading(({ row: { original } }) => (
      <Tooltip label={original.name}>
        <div>
          <Text rows={1}>{original.name || ''}</Text>
        </div>
      </Tooltip>
    )),
  },
  {
    accessor: 'identifier',
    Header: 'Tenant identifier',
    Cell: withCellLoading(({ row: { original } }) => (
      <Tooltip label={original.identifier}>
        <div>
          <Text rows={1}>{original.identifier || ''}</Text>
        </div>
      </Tooltip>
    )),
  },
  {
    accessor: 'createdAt',
    Header: 'Created at',
    maxWidth: maxWidth,
    Cell: withCellLoading(({ row: { original } }) => {
      return format(new Date(original.createdAt), 'dd/MM/yyyy HH:mm');
    }),
  },
  {
    accessor: 'updatedAt',
    Header: 'Updated at',
    maxWidth: maxWidth,
    Cell: withCellLoading(({ row: { original } }) => {
      return format(new Date(original.updatedAt), 'dd/MM/yyyy HH:mm');
    }),
  },
];
