import moment from 'moment';
import React from 'react';
import * as capitalize from 'lodash.capitalize';
import { Data, Table } from '../../design-system/table/Table';
import { useMantineColorScheme } from '@mantine/core';
import { ColumnWithStrictAccessor } from 'react-table';
import { Button, colors, Text } from '../../design-system';

export enum ChangeEntityTypeEnum {
  NOTIFICATION_TEMPLATE = 'NotificationTemplate',
  MESSAGE_TEMPLATE = 'MessageTemplate',
}

export const ChangesTable = ({ changes, loading }: { changes: Data[]; loading: boolean }) => {
  const { colorScheme } = useMantineColorScheme();

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
      maxWidth: 50,
      Cell: ({ id, enabled }: any) => {
        return (
          <div style={{ textAlign: 'right' }}>
            <Button variant="outline" disabled={enabled}>
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
