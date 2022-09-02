import { useState } from 'react';
import { Badge, ActionIcon, useMantineTheme } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
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
import { useEnvController } from '../../store/use-env-controller';

function SubscribersList() {
  const { readonly } = useEnvController();
  const [page, setPage] = useState<number>(0);
  const { subscibers, loading: isLoading, totalCount, pageSize } = useSubscribers(page);
  const theme = useMantineTheme();
  const navigate = useNavigate();

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: '_id',
      Header: 'Subscriber Id',
      Cell: ({ _id }: any) => (
        <Tooltip label={_id}>
          <Text rows={1}>{_id}</Text>
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
      accessor: 'deleted',
      Header: 'Deleted',
      Cell: ({ deleted }: any) => (
        <Tooltip label={deleted ? 'true' : 'false'}>
          <Text rows={1}>{deleted ? 'true' : 'false'}</Text>
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

  return (
    <PageContainer>
      <PageMeta title="Subscribers" />
      <PageHeader title="Subscribers" />
      <SubscibersListTableWrapper>
        <Table
          loading={isLoading}
          data-test-id="notifications-template"
          columns={columns}
          data={subscibers || []}
          pagination={{
            pageSize: pageSize,
            current: page,
            total: totalCount,
            onPageChange: handleTableChange,
          }}
        >
          {' '}
        </Table>
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
