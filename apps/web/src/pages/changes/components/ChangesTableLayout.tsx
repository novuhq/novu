import * as capitalize from 'lodash.capitalize';
import { format } from 'date-fns';
import { useMantineColorScheme } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';
import styled from '@emotion/styled';

import { promoteChange, discardChange } from '../../../api/changes';
import { IExtendedColumn, Table } from '../../../design-system/table/Table';
import { Button, colors, Text, withCellLoading } from '../../../design-system';
import { QueryKeys } from '../../../api/query.keys';
import { DeleteConfirmModal } from '../../templates/components/DeleteConfirmModal';

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
  const [deletionData, setDeletionData] = useState({ id: '', isDeleting: false });

  const { mutate, isLoading, error } = useMutation(promoteChange, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.currentUnpromotedChanges]);
      queryClient.refetchQueries([QueryKeys.currentPromotedChanges]);
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

  const {
    mutateAsync: deleteChange,
    isLoading: isLoadingDelete,
    error: errorDeleting,
  } = useMutation(discardChange, {
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

  useEffect(() => {
    if (!isLoadingDelete) {
      return;
    }
    setDeletionData((prevData) => ({ ...prevData, isDeleting: true }));
  }, [isLoadingDelete]);

  const confirmDelete = async () => {
    await deleteChange(deletionData.id);
    setDeletionData({ id: '', isDeleting: false });
  };

  const cancelDelete = () => {
    setDeletionData({ id: '', isDeleting: false });
  };

  const onDelete = (id: string) => {
    setDeletionData((prevData) => ({ ...prevData, id }));
  };

  const columns: IExtendedColumn<any>[] = [
    {
      accessor: 'change',
      Header: 'Change',
      Cell: withCellLoading(
        ({
          row: {
            original: { type, templateName, messageType, previousDefaultLayout },
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
            {previousDefaultLayout && (
              <Text data-test-id="previous-default-layout-content" rows={1} mt={5}>
                Previous Default Layout: {previousDefaultLayout}
              </Text>
            )}
            <Text data-test-id="change-content" rows={1} mt={5}>
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
      maxWidth: 150,
      Cell: withCellLoading(({ row: { original } }) => {
        return (
          <div style={{ textAlign: 'right' }}>
            <StyledButtons>
              <Button
                variant="outline"
                data-test-id="promote-btn"
                onClick={() => {
                  mutate(original._id);
                }}
                disabled={original.enabled}
                loading={isLoading}
                mr={10}
              >
                Promote
              </Button>

              <DeleteButton
                variant="outline"
                data-test-id="delete-btn"
                onClick={() => {
                  onDelete(original._id);
                }}
                disabled={original.enabled}
                loading={isLoadingDelete}
              >
                Discard
              </DeleteButton>
            </StyledButtons>
          </div>
        );
      }),
    },
  ];

  return (
    <>
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

      <DeleteConfirmModal
        title="Discard Change"
        description="Are you sure you want to discard this change?"
        isOpen={deletionData.id.length > 0}
        error={(errorDeleting as Error)?.message ?? ''}
        isLoading={deletionData.isDeleting}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText="Discard Change"
        cancelButtonText="Cancel"
      />
    </>
  );
};

const StyledButtons = styled.div`
  display: flex;
`;

const DeleteButton = styled(Button)`
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
`;
