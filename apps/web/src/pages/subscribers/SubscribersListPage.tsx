import { useState } from 'react';
import { format } from 'date-fns';
import { Code, Button } from '@mantine/core';
import type { ISubscriber } from '@novu/shared';

import { useSubscribers } from '../../hooks';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Table, withCellLoading, IExtendedColumn } from '../../design-system';
import { ViewportWide } from '../../design-system/icons/general/ViewportWide';
import { HoverCard } from '../../design-system/hover-card/HoverCard';

const columns: IExtendedColumn<ISubscriber>[] = [
  {
    accessor: 'subscriberId',
    Header: 'Subscriber identifier',
  },
  {
    accessor: 'firstName',
    Header: 'First Name',
  },
  {
    accessor: 'lastName',
    Header: 'Last Name',
  },
  {
    accessor: 'email',
    Header: 'Email',
  },
  {
    accessor: 'phone',
    Header: 'Phone',
  },
  {
    accessor: 'createdAt',
    Header: 'Created At',
    Cell: withCellLoading(({ row: { original } }) => format(new Date(original.createdAt), 'dd.MM.yyyy')),
  },
];

function SubscribersList() {
  const [page, setPage] = useState<number>(0);
  const { subscribers, loading: isLoading, hasMore, pageSize } = useSubscribers(page);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  return (
    <PageContainer title="Subscribers">
      <PageHeader title="Subscribers" />
      <Table
        loading={isLoading}
        data-test-id="subscribers-table"
        columns={columns}
        data={subscribers || []}
        pagination={{
          pageSize: pageSize,
          current: page,
          hasMore,
          minimalPagination: true,
          onPageChange: handleTableChange,
        }}
      />
    </PageContainer>
  );
}

export default SubscribersList;
