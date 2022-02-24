import React from 'react';
import moment from 'moment';
import { Badge, ActionIcon, useMantineTheme } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useTemplates } from '../../api/hooks/use-templates';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tag, Button, Table, colors } from '../../design-system';
import { Edit, PlusCircle } from '../../design-system/icons';

function NotificationList() {
  const { templates, loading: isLoading } = useTemplates();
  const theme = useMantineTheme();

  const columns = [
    { accessor: 'name', Header: 'Name' },
    {
      accessor: 'notificationGroup.name',
      Header: 'Category',
      Cell: ({ notificationGroup }: any) => <Tag data-test-id="category-label"> {notificationGroup?.name}</Tag>,
    },
    {
      accessor: 'createdAt',
      Header: 'Created At',
      Cell: ({ createdAt }: any) => moment(createdAt).format('DD/MM/YYYY HH:mm'),
    },
    {
      accessor: 'status',
      Header: 'Status',
      Cell: ({ draft, active }: any) => (
        <>
          {draft ? (
            <Badge variant="outline" size="md" color="yellow">
              Disabled
            </Badge>
          ) : null}{' '}
          {active ? (
            <Badge variant="outline" size="md" color="green" data-test-id="active-status-label">
              Active
            </Badge>
          ) : null}{' '}
        </>
      ),
    },
    {
      accessor: '_id',
      Header: '',
      Cell: ({ _id }: any) => (
        <ActionIcon
          variant="transparent"
          component={Link}
          to={`/templates/edit/${_id}`}
          data-test-id="template-edit-link">
          <Edit color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80} />
        </ActionIcon>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Notification Template"
        actions={
          <Link to="/templates/create" data-test-id="create-template-btn">
            <Button icon={<PlusCircle />}>New</Button>
          </Link>
        }
      />
      {!isLoading && (
        <Table data-test-id="notifications-template" columns={columns} data={templates || []}>
          {' '}
        </Table>
      )}
    </PageContainer>
  );
}

export default NotificationList;
