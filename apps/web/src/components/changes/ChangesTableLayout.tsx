import moment from 'moment';
import * as capitalize from 'lodash.capitalize';
import { Data, Table } from '../../design-system/table/Table';
import { useMantineColorScheme } from '@mantine/core';
import { ColumnWithStrictAccessor } from 'react-table';
import { Button, colors, Text } from '../../design-system';
import { useMutation, useQueryClient } from 'react-query';
import { promoteChange } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { useEffect } from 'react';
import { showNotification } from '@mantine/notifications';

export const ChangesTable = ({ changes, loading }: { changes: Data[]; loading: boolean }) => {
  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();
  const { mutate, isLoading, error } = useMutation(promoteChange, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.currentUnpromotedChanges]);
      queryClient.refetchQueries([QueryKeys.currentPromotedChanges]);
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

  useEffect(() => {
    if (!error) {
      return;
    }
    showNotification({
      message: (error as Error).message,
      color: 'red',
    });
  }, [error]);

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'change',
      Header: 'Change',
      Cell: ({ type, templateName, messageType }: any) => (
        <div data-test-id="change-type">
          {type === ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE && (
            <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Template Change</Text>
          )}
          {type === ChangeEntityTypeEnum.MESSAGE_TEMPLATE && (
            <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Message Change</Text>
          )}
          {type === ChangeEntityTypeEnum.NOTIFICATION_GROUP && (
            <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Notification Group Change</Text>
          )}
          <Text data-test-id="change-content" rows={1} mt={5}>
            {templateName}
            {messageType ? `, ${messageType}` : null}
          </Text>
        </div>
      ),
    },
    {
      accessor: 'user',
      Header: 'Changed By',
      Cell: ({ user }: any) => (
        <Text data-test-id="subscriber-name" rows={1}>
          {capitalize(user.firstName)} {capitalize(user.lastName)}
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
      accessor: '_id',
      Header: '',
      maxWidth: 50,
      Cell: ({ _id, enabled }: any) => {
        return (
          <div style={{ textAlign: 'right' }}>
            <Button
              variant="outline"
              data-test-id="promote-btn"
              onClick={() => {
                mutate(_id);
              }}
              disabled={enabled}
              loading={isLoading}
            >
              Promote
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Table data-test-id="changes-table" loading={loading} data={changes || []} columns={columns}>
      {' '}
    </Table>
  );
};
