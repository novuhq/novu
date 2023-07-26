import { ITenantEntity } from '@novu/shared';
import { Skeleton } from '@mantine/core';
import { format } from 'date-fns';

import { IExtendedColumn } from '../../../../design-system';

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
