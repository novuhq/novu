import { useState } from 'react';
import { ColumnWithStrictAccessor } from 'react-table';
import { format } from 'date-fns';
import { useSubscribers } from '../../hooks';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Table } from '../../design-system';
import { Data } from '../../design-system/table/Table';
import { ViewportWide } from '../../design-system/icons/general/ViewportWide';
import { HoverCard } from '../../design-system/hover-card/HoverCard';

import { Code, Button } from '@mantine/core';

const columns: ColumnWithStrictAccessor<Data>[] = [
  {
    accessor: 'subscriberId',
    Header: 'Subscriber Id',
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
    Cell: ({ createdAt }: any) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
  },
  {
    accessor: 'data',
    Header: 'Data',
    Cell: ({ data }: any) =>
      data ? (
        <HoverCard width={200} position="bottom" shadow="md" withArrow arrowSize={3.5}>
          <HoverCard.Target>
            <Button>
              <ViewportWide />
            </Button>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Code>{JSON.stringify(data, null, 2)}</Code>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        ''
      ),
  },
];

function SubscribersList() {
  const [page, setPage] = useState<number>(0);
  const { subscribers, loading: isLoading, totalCount, pageSize } = useSubscribers(page);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  return (
    <PageContainer>
      <PageMeta title="Subscribers" />
      <PageHeader title="Subscribers" />
      <Table
        loading={isLoading}
        data-test-id="subscribers-table"
        columns={columns}
        data={subscribers || []}
        pagination={{
          pageSize: pageSize,
          current: page,
          total: totalCount,
          onPageChange: handleTableChange,
        }}
      />
    </PageContainer>
  );
}

export default SubscribersList;
