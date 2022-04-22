import moment from 'moment';
import * as capitalize from 'lodash.capitalize';
import { Data, Table } from '../../design-system/table/Table';
import { useMantineColorScheme } from '@mantine/core';
import { ColumnWithStrictAccessor } from 'react-table';
import { Button, colors, Text } from '../../design-system';
import { useMutation, useQueryClient } from 'react-query';
import { promoteChange } from '../../api/changes';
import { QueryKeys } from '../../api/query.keys';

export enum ChangeEntityTypeEnum {
  NOTIFICATION_TEMPLATE = 'NotificationTemplate',
  MESSAGE_TEMPLATE = 'MessageTemplate',
}

export const ChangesTable = ({ changes, loading }: { changes: Data[]; loading: boolean }) => {
  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();
  const { mutate, isLoading } = useMutation(promoteChange, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.currentUnpromotedChanges]);
      queryClient.refetchQueries([QueryKeys.currentPromotedChanges]);
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

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
            {JSON.stringify(change)}
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
    <Table loading={loading} data={changes || []} columns={columns}>
      {' '}
    </Table>
  );
};
