import * as capitalize from 'lodash.capitalize';
import { format } from 'date-fns';
import { useMantineColorScheme } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { useEffect } from 'react';
import { showNotification } from '@mantine/notifications';

import { IExtendedColumn, Table, Button, colors, Text, withCellLoading } from '@novu/design-system';
import { promoteChange } from '../../../api/changes';
import { QueryKeys } from '../../../api/query.keys';

export const ChangesTable = ({
  changes,
  loading,
  handleTableChange,
  page,
  pageSize,
  totalCount,
  dataTestId,
}: {
  changes: any[];
  loading: boolean;
  handleTableChange: (pageIndex) => void;
  page: Number;
  pageSize: Number;
  totalCount: Number;
  dataTestId?: string;
}) => {
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

  const columns: IExtendedColumn<any>[] = [
    {
      accessor: 'change',
      Header: 'Change',
      Cell: withCellLoading(
        ({
          row: {
            original: { type, templateName, messageType, previousDefaultLayout, translationGroup },
          },
        }) => (
          <div data-test-id="change-type">
            {type === ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Workflow Change</Text>
            )}
            {type === ChangeEntityTypeEnum.MESSAGE_TEMPLATE && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Message Change</Text>
            )}
            {type === ChangeEntityTypeEnum.NOTIFICATION_GROUP && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Notification Group Change</Text>
            )}
            {type === ChangeEntityTypeEnum.FEED && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Feed Change</Text>
            )}
            {type === ChangeEntityTypeEnum.LAYOUT && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Layout Change</Text>
            )}
            {type === ChangeEntityTypeEnum.DEFAULT_LAYOUT && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Default Layout Change</Text>
            )}
            {type === ChangeEntityTypeEnum.TRANSLATION_GROUP && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Translation Group Change</Text>
            )}
            {type === ChangeEntityTypeEnum.TRANSLATION && (
              <Text color={colorScheme === 'dark' ? colors.B40 : colors.B70}>Translation Change</Text>
            )}
            {previousDefaultLayout && (
              <Text data-test-id="previous-default-layout-content" rows={1} mt={5}>
                Previous Default Layout: {previousDefaultLayout}
              </Text>
            )}
            <Text data-test-id="change-content" rows={1} mt={5}>
              {translationGroup ? `${translationGroup}, ` : null}
              {templateName}
              {messageType ? `, ${messageType}` : null}
            </Text>
          </div>
        )
      ),
    },
    {
      accessor: 'user',
      Header: 'Changed By',
      Cell: withCellLoading(({ row: { original } }) => (
        <Text data-test-id="subscriber-name" rows={1}>
          {capitalize(original.user.firstName)} {capitalize(original.user.lastName)}
        </Text>
      )),
    },
    {
      accessor: 'createdAt',
      Header: 'Date Changed',
      Cell: withCellLoading(({ row: { original } }) => {
        return format(new Date(original.createdAt), 'dd/MM/yyyy');
      }),
    },
    {
      accessor: '_id',
      Header: '',
      Cell: withCellLoading(({ row: { original } }) => {
        return (
          <div style={{ textAlign: 'right', paddingRight: '20px' }}>
            <Button
              variant="outline"
              data-test-id="promote-btn"
              onClick={() => {
                mutate(original._id);
              }}
              disabled={original.enabled}
              loading={isLoading}
            >
              Promote
            </Button>
          </div>
        );
      }),
    },
  ];

  return (
    <Table
      data-test-id={dataTestId}
      loading={loading}
      data={changes || []}
      columns={columns}
      pagination={{
        pageSize: pageSize,
        current: page,
        total: totalCount,
        onPageChange: handleTableChange,
      }}
    />
  );
};
