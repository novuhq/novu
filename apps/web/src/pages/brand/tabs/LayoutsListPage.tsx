import { ColumnWithStrictAccessor } from 'react-table';
import { Data, Table } from '../../../design-system/table/Table';
import { colors, LoadingOverlay, Text, Tooltip } from '../../../design-system';
import { format } from 'date-fns';
import { ActionIcon, useMantineTheme, UnstyledButton } from '@mantine/core';
import { Edit, Trash } from '../../../design-system/icons';
import styled from '@emotion/styled';
import { useState } from 'react';
import { LayoutEditor } from './LayoutEditor';
import { When } from '../../../components/utils/When';
import { useLayouts, useEnvController } from '../../../hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLayoutById } from '../../../api/layouts';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { QueryKeys } from '../../../api/query.keys';
import { DeleteConfirmModal } from '../../templates/components/DeleteConfirmModal';

const enum ActivePageEnum {
  LAYOUTS_LIST = 'layouts_list',
  EDIT_LAYOUT = 'edit_layout',
  CREATE_LAYOUT = 'create_layout',
}
type LayoutsListPageProps = {
  handleLayoutAnalytics: (event: string, data?: Record<string, unknown>) => void;
};

export function LayoutsListPage({ handleLayoutAnalytics }: LayoutsListPageProps) {
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const [page, setPage] = useState<number>(0);
  const [editId, setEditId] = useState('');
  const [activeScreen, setActiveScreen] = useState(ActivePageEnum.LAYOUTS_LIST);
  const [toDelete, setToDelete] = useState('');
  const { mutateAsync: deleteLayout, isLoading: isLoadingDelete } = useMutation(deleteLayoutById, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });
  const { layouts, isLoading, totalCount, pageSize, refetchLayouts } = useLayouts(page);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const cancelDelete = () => {
    setToDelete('');
  };

  const onDelete = (id) => {
    setToDelete(id);
  };

  const confirmDelete = async () => {
    await handleDeleteLayout(toDelete);
    setToDelete('');
  };

  const handleDeleteLayout = async (layoutId: string) => {
    try {
      await deleteLayout(layoutId);
      await refetchLayouts();
      successMessage('Layout deleted!');
    } catch (e: any) {
      errorMessage(e?.message || 'Could not delete');
    }
  };

  const goBack = async () => {
    setEditId('');
    setActiveScreen(ActivePageEnum.LAYOUTS_LIST);
  };

  const editLayout = (id: string) => {
    setEditId(id);
    setActiveScreen(ActivePageEnum.EDIT_LAYOUT);
    handleLayoutAnalytics('Edit screen opened', { layoutId: id });
  };

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'name',
      Header: 'Name',
      Cell: ({ name }: any) => (
        <Tooltip label={name}>
          <div>
            <Text rows={1}>{name}</Text>
          </div>
        </Tooltip>
      ),
    },
    {
      accessor: 'description',
      Header: 'Description',
      Cell: ({ description }: any) => (
        <Tooltip label={description}>
          <div>
            <Text rows={1}>{description}</Text>
          </div>
        </Tooltip>
      ),
    },
    {
      accessor: 'createdAt',
      Header: 'Created At',
      Cell: ({ createdAt }: any) => format(new Date(createdAt), 'dd/MM/yyyy HH:mm'),
    },
    {
      accessor: 'updatedAt',
      Header: 'Last Updated',
      Cell: ({ updatedAt }: any) => format(new Date(updatedAt), 'dd/MM/yyyy HH:mm'),
    },
    {
      accessor: '_id',
      Header: '',
      maxWidth: 50,
      Cell: ({ _id }: any) => (
        <ActionButtonWrapper>
          <ActionIcon variant="transparent" onClick={() => editLayout(_id)}>
            <Edit
              style={{
                width: '20px',
                height: '20px',
              }}
              color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80}
            />
          </ActionIcon>
          {!readonly && (
            <ActionIcon
              variant="transparent"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(_id);
              }}
            >
              <Trash color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80} />
            </ActionIcon>
          )}
        </ActionButtonWrapper>
      ),
    },
  ];

  function onRowClick(row) {
    editLayout(row.values._id);
  }

  return (
    <>
      <When truthy={editId.length && activeScreen === ActivePageEnum.EDIT_LAYOUT}>
        <LayoutEditor editMode goBack={goBack} id={editId} />
      </When>
      <When truthy={activeScreen === ActivePageEnum.CREATE_LAYOUT}>
        <LayoutEditor goBack={goBack} />
      </When>
      <When truthy={activeScreen === ActivePageEnum.LAYOUTS_LIST}>
        <LoadingOverlay visible={isLoading || isLoadingDelete}>
          <div
            style={{
              textAlign: 'right',
              marginBottom: '10px',
            }}
          >
            <UnstyledButton
              disabled={readonly}
              onClick={() => {
                setActiveScreen(ActivePageEnum.CREATE_LAYOUT);
                handleLayoutAnalytics('Create new layout btn clicked');
              }}
            >
              <Text gradient={!readonly} color={colors.B60}>
                + Create New Layout
              </Text>
            </UnstyledButton>
          </div>

          <TemplateListTableWrapper>
            <Table
              columns={columns}
              data={layouts || []}
              onRowClick={onRowClick}
              pagination={{
                pageSize: pageSize,
                current: page,
                total: totalCount,
                onPageChange: handleTableChange,
              }}
            />
          </TemplateListTableWrapper>
        </LoadingOverlay>
      </When>

      <DeleteConfirmModal target="layout" isOpen={toDelete.length > 0} confirm={confirmDelete} cancel={cancelDelete} />
    </>
  );
}

const ActionButtonWrapper = styled.div`
  text-align: right;

  button {
    display: inline-block;
    opacity: 0;
    transition: opacity 0.1s ease-in;
  }
`;

const TemplateListTableWrapper = styled.div`
  tr:hover {
    cursor: pointer;

    ${ActionButtonWrapper} {
      button {
        opacity: 1;
      }
    }
  }
`;
