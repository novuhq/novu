import { useState } from 'react';
import { format } from 'date-fns';
import { Code, Button } from '@mantine/core';
import type { ISubscriber } from '@novu/shared';

import { useSubscribers } from '../../hooks';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Table, withCellLoading, IExtendedColumn, ViewportWide, HoverCard } from '@novu/design-system';

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
    Cell: withCellLoading(({ row: { original } }) => format(new Date(original.createdAt), 'dd/MM/yyyy HH:mm')),
  },
  {
    accessor: 'data',
    Header: 'Data',
    Cell: withCellLoading(({ row: { original } }) =>
      original.data ? (
        <HoverCard width={200} position="bottom" shadow="md" withArrow arrowSize={3.5}>
          <HoverCard.Target>
            <Button>
              <ViewportWide />
            </Button>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Code>{JSON.stringify(original.data, null, 2)}</Code>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        ''
      )
    ),
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
