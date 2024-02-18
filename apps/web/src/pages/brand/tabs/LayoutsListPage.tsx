import styled from '@emotion/styled';
import { ActionIcon, useMantineTheme } from '@mantine/core';
import type { ILayoutEntity } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { deleteLayoutById } from '../../../api/layouts';
import { QueryKeys } from '../../../api/query.keys';
import { When } from '../../../components/utils/When';
import {
  colors,
  Text,
  Tooltip,
  PlusButton,
  withCellLoading,
  Edit,
  Trash,
  IExtendedColumn,
  Table,
} from '@novu/design-system';
import { useEnvController, useLayouts } from '../../../hooks';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { DeleteConfirmModal } from '../../templates/components/DeleteConfirmModal';
import { LayoutEditor } from './LayoutEditor';

const enum ActivePageEnum {
  LAYOUTS_LIST = 'layouts_list',
  EDIT_LAYOUT = 'edit_layout',
  CREATE_LAYOUT = 'create_layout',
}
type LayoutsListPageContext = {
  handleLayoutAnalytics: (event: string, data?: Record<string, unknown>) => void;
};

export function LayoutsListPage() {
  const { handleLayoutAnalytics } = useOutletContext<LayoutsListPageContext>();
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

  const goBack = useCallback(() => {
    setEditId('');
    setActiveScreen(ActivePageEnum.LAYOUTS_LIST);
  }, []);

  const editLayout = (id?: string) => {
    if (typeof id === 'undefined') return;

    setEditId(id);
    setActiveScreen(ActivePageEnum.EDIT_LAYOUT);
    handleLayoutAnalytics('Edit screen opened', { layoutId: id });
  };

  const columns: IExtendedColumn<ILayoutEntity>[] = [
    {
      accessor: 'name',
      Header: 'Name',
      Cell: withCellLoading(({ row: { original } }) => (
        <Tooltip label={original.name}>
          <div>
            <Text rows={1}>{original.name}</Text>
            <Text rows={1} size="xs" color={colors.B40}>
              {original.identifier}
            </Text>
          </div>
        </Tooltip>
      )),
    },
    {
      accessor: 'description',
      Header: 'Description',
      Cell: withCellLoading(({ row: { original } }) => (
        <Tooltip label={original.description}>
          <div>
            <Text rows={1}>{original.description ?? ''}</Text>
          </div>
        </Tooltip>
      )),
    },
    {
      accessor: 'createdAt',
      Header: 'Created At',
      Cell: withCellLoading(({ row: { original } }) => format(new Date(original.createdAt ?? ''), 'dd/MM/yyyy HH:mm')),
    },
    {
      accessor: 'updatedAt',
      Header: 'Last Updated',
      Cell: withCellLoading(({ row: { original } }) => format(new Date(original.updatedAt ?? ''), 'dd/MM/yyyy HH:mm')),
    },
    {
      accessor: '_id',
      Header: '',
      maxWidth: 50,
      Cell: withCellLoading(({ row: { original } }) => (
        <ActionButtonWrapper>
          <ActionIcon variant="transparent" onClick={() => editLayout(original._id)}>
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
                onDelete(original._id);
              }}
            >
              <Trash color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80} />
            </ActionIcon>
          )}
        </ActionButtonWrapper>
      )),
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
        <div
          style={{
            marginBottom: '10px',
            marginTop: '10px',
          }}
        >
          <PlusButton
            isGradient={!readonly}
            label="Add New Layout"
            disabled={readonly || isLoading || isLoadingDelete}
            onClick={() => {
              setActiveScreen(ActivePageEnum.CREATE_LAYOUT);
              handleLayoutAnalytics('Create new layout btn clicked');
            }}
          />
        </div>

        <TemplateListTableWrapper>
          <Table
            loading={isLoading || isLoadingDelete}
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
  [data-table-holder] {
    margin: 0 -30px;
  }
`;
