import { useQuery } from 'react-query';
import { Badge, Col, Form, Input, Row, Select, Statistic, Table, Tag, Tooltip } from 'antd';
import moment from 'moment';
import { ChannelTypeEnum } from '@notifire/shared';
import styled from 'styled-components';
import { useState } from 'react';
import { PageHeader } from '../../components/layout/components/PageHeader';
import { getActivityList, getActivityStats } from '../../api/activity';
import { useTemplates } from '../../api/hooks/use-templates';

const { Column } = Table;

interface IFiltersForm {
  channels: ChannelTypeEnum[];
}

export function ActivitiesPage() {
  const { templates, loading: loadingTemplates } = useTemplates();
  const [page, setPage] = useState<number>(0);
  const [filters, setFilters] = useState<IFiltersForm>({ channels: [] });
  const { data, isLoading, isFetching } = useQuery<{ data: any[]; totalCount: number; pageSize: number }>(
    ['activitiesList', page, filters],
    () => getActivityList(page, filters),
    { keepPreviousData: true }
  );

  const { data: activityStats, isLoading: loadingActivityStats } = useQuery<{
    monthlySent: number;
    weeklySent: number;
  }>('activityStats', getActivityStats);

  function handleTableChange(pagination) {
    setPage(pagination.current - 1);
  }

  function onFiltersChange(formData: IFiltersForm) {
    setFilters(formData);
  }

  return (
    <>
      <PageHeader title="Activity Feed" />

      <Row>
        <Col md={24} style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Statistic
              data-test-id="monthly-sent-stats"
              title="Sent this Month"
              loading={loadingActivityStats}
              value={activityStats?.monthlySent}
              style={{ margin: '0 30px' }}
            />
            <Statistic
              data-test-id="weekly-sent-stats"
              title="Sent this Week"
              loading={loadingActivityStats}
              value={activityStats?.weeklySent}
              style={{ margin: '0 30px' }}
            />
          </div>
        </Col>
        <Col md={24}>
          <div>
            <Form layout="vertical" onValuesChange={onFiltersChange}>
              <Row gutter={15}>
                <Col md={8}>
                  <Form.Item name="channels" label="Channels">
                    <Select placeholder="In-App, SMS, email" mode="multiple" data-test-id="activities-filter">
                      <Select.Option value={ChannelTypeEnum.SMS}>SMS</Select.Option>
                      <Select.Option value={ChannelTypeEnum.EMAIL}>Email</Select.Option>
                      <Select.Option value={ChannelTypeEnum.IN_APP}>In-App</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col md={8}>
                  <Form.Item name="templates" label="Templates">
                    <Select
                      placeholder="Pick a template to view data"
                      mode="multiple"
                      data-test-id="templates-filter"
                      loading={loadingTemplates}>
                      {templates?.map((template) => (
                        <Select.Option key={template._id} value={template._id as string}>
                          {template.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col md={8}>
                  <Form.Item name="search" label="Email or Id">
                    <Input placeholder="Search by subscriber email or id" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </Col>
        <Col md={24}>
          <Table
            onChange={handleTableChange}
            pagination={{ current: page + 1, pageSize: data?.pageSize, total: data?.totalCount }}
            data-test-id="activities-table"
            size="small"
            dataSource={data?.data || []}
            loading={isLoading || isFetching}
            rowKey="_id">
            <Column
              title=""
              dataIndex="status"
              key="name"
              render={(status, record: any) => (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {record.status === 'sent' ? <Badge status="success" title="Message Processed" /> : null}
                  {record.status === 'error' ? (
                    <Tooltip title={record.errorText}>
                      <Badge status="error" title={record.errorText} />
                    </Tooltip>
                  ) : null}
                  {record.status === 'warning' ? (
                    <Tooltip title={record.errorText}>
                      <Badge status="warning" title={record.errorText} />
                    </Tooltip>
                  ) : null}
                </div>
              )}
            />
            <Column
              title="Template Name"
              dataIndex="name"
              key="name"
              render={(status, record: any) => <div data-test-id="row-template-name">{record.template.name}</div>}
            />
            <Column
              title="Subscriber"
              dataIndex="name"
              key="name"
              render={(status, record: any) => (
                <>
                  {record.subscriber.firstName} {record.subscriber.lastName}
                </>
              )}
            />
            <Column
              title="Recipient"
              dataIndex="recipient"
              key="recipient"
              render={(status, record: any) => (
                <>
                  {record.channel === ChannelTypeEnum.EMAIL ? record.email : ''}{' '}
                  {record.channel === ChannelTypeEnum.SMS ? record.phone : ''}
                </>
              )}
            />
            <Column
              title="Channel"
              dataIndex="channel"
              key="channel"
              render={(status, record: any) => (
                <ChannelsItemWrapper>
                  {record.channel === ChannelTypeEnum.EMAIL ? (
                    <Tooltip title="Delivered on Email Channel">
                      <Tag color="cyan" data-test-id="row-email-channel">
                        Email
                      </Tag>
                    </Tooltip>
                  ) : null}
                  {record.channel === ChannelTypeEnum.IN_APP ? (
                    <Tooltip title="Delivered on Inbox Channel">
                      <Tag color="geekblue" data-test-id="row-in-app-channel">
                        In-App
                      </Tag>
                    </Tooltip>
                  ) : null}
                  {record.channel === ChannelTypeEnum.SMS ? (
                    <Tooltip title="Delivered on SMS Channel">
                      <Tag color="magenta" data-test-id="row-sms-channel">
                        SMS
                      </Tag>
                    </Tooltip>
                  ) : null}
                </ChannelsItemWrapper>
              )}
            />
            <Column
              title="Sent On"
              key="createdAt"
              render={(createdAt, record: any) => {
                return moment(record.createdAt).isAfter(moment().subtract(1, 'day'))
                  ? moment(record.createdAt).fromNow()
                  : moment(record.createdAt).format('DD/MM/YYYY HH:mm');
              }}
            />
          </Table>
        </Col>
      </Row>
    </>
  );
}

const ChannelsItemWrapper = styled.div`
  display: flex;
  align-items: center;
  svg {
    margin-right: 10px;
    font-size: 12px;
  }
`;
