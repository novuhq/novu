import { Button, Col, Row, Table, Tag, Typography } from 'antd';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { PageHeader } from '../../components/layout/components/PageHeader';
import { useTemplates } from '../../../api/hooks/use-templates';

const { Column } = Table;

function NotificationList() {
  const { templates, loading: isLoading } = useTemplates();

  return (
    <>
      <PageHeader
        title="Notification Templates"
        actions={
          <Link to="/templates/create" data-test-id="create-template-btn">
            <Button type="primary" className="ml-2">
              <PlusOutlined />
              <span>New</span>
            </Button>
          </Link>
        }
      />

      <GroupWrapper>
        <Col md={24}>
          <div>
            <Table data-test-id="notifications-template" dataSource={templates || []} loading={isLoading} rowKey="_id">
              <Column title="Name" dataIndex="name" key="name" />

              <Column
                title="Category"
                dataIndex="notificationGroup.name"
                key="notificationGroup.name"
                render={(status, record: any) => (
                  <>
                    <Tag data-test-id="category-label">{record.notificationGroup?.name}</Tag>
                  </>
                )}
              />
              <Column
                title="Created At"
                key="createdAt"
                render={(createdAt, record: any) => moment(record.createdAt).format('DD/MM/YYYY HH:mm')}
              />
              <Column
                title="Status"
                dataIndex="status"
                key="tags"
                render={(status, record: any) => (
                  <>
                    {record.draft ? <Tag color="yellow">Disabled</Tag> : null}
                    {record.active ? (
                      <Tag color="green" data-test-id="active-status-label">
                        Active
                      </Tag>
                    ) : null}
                  </>
                )}
              />
              <Column
                key="edit-btn"
                render={(_, record: any) => (
                  <Link to={`/templates/edit/${record._id}`} data-test-id="template-edit-link">
                    <Button type="ghost" size="small">
                      EDIT
                    </Button>
                  </Link>
                )}
              />
            </Table>
          </div>
        </Col>
      </GroupWrapper>
    </>
  );
}

const GroupWrapper = styled.div``;

const GroupTitle = styled(Typography.Title)``;
export default NotificationList;
