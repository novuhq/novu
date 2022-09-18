import { useState } from 'react';
import { ColumnWithStrictAccessor } from 'react-table';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { useSubscribers } from '../../api/hooks/use-subscribers';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Table, Text } from '../../design-system';
import { Tooltip } from '../../design-system';
import { Data } from '../../design-system/table/Table';

const columns: ColumnWithStrictAccessor<Data>[] = [
  {
    accessor: 'subscriberId',
    Header: 'Subscriber Id',
    Cell: ({ subscriberId }: any) => (
      <Tooltip label={subscriberId}>
        <Text rows={1}>{subscriberId}</Text>
      </Tooltip>
    ),
  },
  {
    accessor: 'firstName',
    Header: 'First Name',
    Cell: ({ firstName }: any) => (
      <Tooltip label={firstName}>
        <Text rows={1}>{firstName}</Text>
      </Tooltip>
    ),
  },
  {
    accessor: 'lastName',
    Header: 'Last Name',
    Cell: ({ lastName }: any) => (
      <Tooltip label={lastName}>
        <Text rows={1}>{lastName}</Text>
      </Tooltip>
    ),
  },
  {
    accessor: 'email',
    Header: 'Email',
    Cell: ({ email }: any) => (
      <Tooltip label={email}>
        <Text rows={1}>{email}</Text>
      </Tooltip>
    ),
  },
  {
    accessor: 'phone',
    Header: 'Phone',
    Cell: ({ phone }: any) => (
      <Tooltip label={phone}>
        <Text rows={1}>{phone}</Text>
      </Tooltip>
    ),
  },
  {
    accessor: 'createdAt',
    Header: 'Created At',
    Cell: ({ createdAt }: any) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
  },
];

function SubscribersList() {
  const [page, setPage] = useState<number>(0);
  const { subscibers, loading: isLoading, totalCount, pageSize } = useSubscribers(page);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  return (
    <PageContainer>
      <PageMeta title="Subscribers" />
      <PageHeader title="Subscribers" />
      <SubscibersListTableWrapper>
        <Table
          loading={isLoading}
          data-test-id="subscribers-table"
          columns={columns}
          data={subscibers || []}
          pagination={{
            pageSize: pageSize,
            current: page,
            total: totalCount,
            onPageChange: handleTableChange,
          }}
        />
      </SubscibersListTableWrapper>
    </PageContainer>
  );
}

export default SubscribersList;

const ActionButtonWrapper = styled.div`
  text-align: right;

  a {
    display: inline-block;
    opacity: 0;
    transition: opacity 0.1s ease-in;
  }
`;

const SubscibersListTableWrapper = styled.div`
  tr:hover {
    cursor: pointer;

    ${ActionButtonWrapper} {
      a {
        opacity: 1;
      }
    }
  }
`;
