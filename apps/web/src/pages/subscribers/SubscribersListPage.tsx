import { Badge, ActionIcon, useMantineTheme } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { ColumnWithStrictAccessor } from 'react-table';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { useSubscribers } from '../../api/hooks/use-subscribers';
import PageMeta from '../../components/layout/components/PageMeta';
import PageContainer from '../../components/layout/components/PageContainer';
import { Table, Text } from '../../design-system';
import { Tooltip } from '../../design-system';
import { Data } from '../../design-system/table/Table';
import { useEnvController } from '../../store/use-env-controller';

function SubscribersList() {
  const { readonly } = useEnvController();
  const { subscibers, loading: isLoading } = useSubscribers();
  const theme = useMantineTheme();
  const navigate = useNavigate();

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
  ];

  return (
    <PageContainer>
      <PageMeta title="Subscribers" />
      <SubscibersListTableWrapper>
        <Table loading={isLoading} data-test-id="notifications-template" columns={columns} data={subscibers || []}>
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
