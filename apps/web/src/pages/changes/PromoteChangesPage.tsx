import React from 'react';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, colors, Table, Tabs, Text, Tooltip } from '../../design-system';
import { Container, useMantineColorScheme } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { ColumnWithStrictAccessor } from 'react-table';
import { Data } from '../../design-system/table/Table';
import PageMeta from '../../components/layout/components/PageMeta';
import moment from 'moment';
import styled from '@emotion/styled';
import { useEnvironmentChanges } from '../../api/hooks/use-environment-changes';
import { useMutation } from 'react-query';
import { promoteChange } from '../../api/changes';

export enum ChangeEntityTypeEnum {
  NOTIFICATION_TEMPLATE = 'NotificationTemplate',
  MESSAGE_TEMPLATE = 'MessageTemplate',
}

export function PromoteChangesPage() {
  const { colorScheme } = useMantineColorScheme();
  const { changes, isLoadingChanges, refetchChanges, history, isLoadingHistory, refetchHistory } =
    useEnvironmentChanges();
  const { isLoading: isPromoteChangeLoading, mutateAsync: promoteCurrentChange } = useMutation<
    {},
    never,
    { id: string }
  >(({ id }) => promoteChange(id));

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'change',
      Header: 'Change',
      Cell: ({ type, change }: any) => (
        <div>
          {type === ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE && (
            <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Template Change</Text>
          )}
          {type === ChangeEntityTypeEnum.MESSAGE_TEMPLATE && (
            <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Message Change</Text>
          )}
          <Text rows={1} mt={5}>
            {change}
          </Text>
        </div>
      ),
    },
    {
      accessor: 'changedBy',
      Header: 'Changed By',
      Cell: ({ changedBy }: any) => (
        <Text data-test-id="subscriber-name" rows={1}>
          {capitalize(changedBy.firstName)} {capitalize(changedBy.lastName)}
        </Text>
      ),
    },
    {
      accessor: 'createdAt',
      Header: 'Date Changed',
      Cell: ({ createdAt }: any) => {
        return moment(createdAt).format('DD/MM/YYYY');
      },
    },
    {
      accessor: 'id',
      Header: '',
      maxWidth: 40,
      Cell: ({ id, enabled }: any) => {
        return (
          <Button variant="outline" disabled={enabled}>
            Promote
          </Button>
        );
      },
    },
  ];
  const menuTabs = [
    {
      label: 'Pending',
      content: <ChangesTable loading={isLoadingChanges} changes={changes?.data} columns={columns} />,
    },
    {
      label: 'History',
      content: <ChangesTable loading={isLoadingHistory} changes={history?.data} columns={columns} />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Changes" />
      <PageHeader title="Changes" actions={<Button>Promote All</Button>} />
      <StyledTabs>
        <Tabs menuTabs={menuTabs} />
      </StyledTabs>
    </PageContainer>
  );
}

const ChangesTable = ({
  changes,
  columns,
  loading,
}: {
  changes: Data[] | undefined;
  columns: ColumnWithStrictAccessor<Data>[];
  loading: boolean;
}) => {
  return (
    <Table loading={loading} data={changes || []} columns={columns}>
      {' '}
    </Table>
  );
};

const StyledTabs = styled.div`
  .mantine-Tabs-tabsListWrapper {
    margin-left: 30px;
    margin-top: 15px;
  }
`;
const StyledButton = styled(Button)<{ theme: string }>`
  background-image: ${({ theme }) =>
    theme === 'dark'
      ? `linear-gradient(0deg, ${colors.B17} 0%, ${colors.B17} 100%),linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)`
      : `linear-gradient(0deg, ${colors.B98} 0%, ${colors.B98} 100%),linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)`};
`;
