import { ColumnWithStrictAccessor } from 'react-table';
import { Data, Table } from '../../../design-system/table/Table';
import { Button, colors, LoadingOverlay, Tag, Text, Tooltip } from '../../../design-system';
import { format } from 'date-fns';
import { ActionIcon, useMantineTheme } from '@mantine/core';
import { Edit, PlusCircle, PlusGradient, Trash } from '../../../design-system/icons';
import styled from '@emotion/styled';
import { useState } from 'react';
import { LayoutEditor } from './LayoutEditor';
import { DeleteConfirmModal } from '../../../components/templates/DeleteConfirmModal';
import { When } from '../../../components/utils/When';
import { useLayouts } from '../../../api/hooks/use-layouts';

const enum ActivePageEnum {
  LAYOUTS_LIST = 'layouts_list',
  EDIT_LAYOUT = 'edit_layout',
  CREATE_LAYOUT = 'create_layout',
}

export function LayoutsListPage() {
  const theme = useMantineTheme();
  const [page, setPage] = useState<number>(0);
  const [editId, setEditId] = useState('');
  const [activeScreen, setActiveScreen] = useState(ActivePageEnum.LAYOUTS_LIST);
  const [toDelete, setToDelete] = useState('');
  const { layouts, isLoading, totalCount, pageSize } = useLayouts(page);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const cancelDelete = () => {
    setToDelete('');
  };

  const onDelete = (id) => {
    setToDelete(id);
  };

  const confirmDelete = () => {
    handleDeleteLayout(toDelete);
    setToDelete('');
  };

  const handleDeleteLayout = (layoutId: string) => {};

  const goBack = () => {
    setActiveScreen(ActivePageEnum.LAYOUTS_LIST);
    setEditId('');
  };

  const editLayout = (id: string) => {
    setEditId(id);
    setActiveScreen(ActivePageEnum.EDIT_LAYOUT);
  };

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'name',
      Header: 'Name',
      Cell: ({ name }: any) => (
        <Tooltip label={name}>
          <Text rows={1}>{name}</Text>
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
      accessor: 'used',
      Header: 'Used in Prod',
      Cell: ({ used }: any) => <Tag>{used ? 'Used' : 'Not Used'}</Tag>,
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
          <ActionIcon
            variant="transparent"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(_id);
            }}
          >
            <Trash color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80} />
          </ActionIcon>
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
        <LoadingOverlay visible={isLoading}>
          <Button
            variant="outline"
            onClick={() => setActiveScreen(ActivePageEnum.CREATE_LAYOUT)}
            icon={
              theme.colorScheme === 'dark' ? <PlusCircle /> : <PlusGradient style={{ width: '20', height: '20' }} />
            }
          >
            Add Layout
          </Button>
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
