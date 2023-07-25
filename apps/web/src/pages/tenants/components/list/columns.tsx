import { ITenantEntity } from '@novu/shared';
import { IExtendedColumn } from '../../../../design-system';
import { Skeleton } from '@mantine/core';

const { format } = require('date-fns');

const maxWidth = 60;

export const columns: IExtendedColumn<ITenantEntity>[] = [
  {
    accessor: 'name',
    Header: 'Name',
  },
  {
    accessor: 'identifier',
    Header: 'Tenant identifier',
  },
  {
    accessor: 'createdAt',
    Header: 'Create at',
    maxWidth: maxWidth,
    Cell: ({ row: { original }, isLoading }) => {
      return isLoading ? (
        <Skeleton width={100} height={20} />
      ) : (
        format(new Date(original.createdAt), 'dd/MM/yyyy HH:mm')
      );
    },
  },
  {
    accessor: 'updatedAt',
    Header: 'Updated at',
    maxWidth: maxWidth,
    Cell: ({ row: { original }, isLoading }) => {
      return isLoading ? (
        <Skeleton width={100} height={20} />
      ) : (
        format(new Date(original.createdAt), 'dd/MM/yyyy HH:mm')
      );
    },
  },
];
