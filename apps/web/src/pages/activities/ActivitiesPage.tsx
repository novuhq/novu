import React, { useState } from 'react';
import { ChannelTypeEnum } from '@notifire/shared';
import { useQuery } from 'react-query';
import { ColumnWithStrictAccessor } from 'react-table';
import { Group } from '@mantine/core';
import moment from 'moment';
import { Badge } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { useTemplates } from '../../api/hooks/use-templates';
import { getActivityList } from '../../api/activity';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { Data, Table } from '../../design-system/table/Table';
import { Select, Tag, Text, Tooltip, Input } from '../../design-system';
import { ActivityStatistics } from './components/ActivityStatistics';
import { ActivityGraph } from './components/ActivityGraph';

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

  function onFiltersChange(formData: IFiltersForm) {
    setFilters(formData);
  }

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const { handleSubmit, control } = useForm({});

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'status',
      Header: '',
      maxWidth: 10,
      width: 10,
      Cell: ({ status, errorText }: any) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {status === 'sent' ? <Badge status="success" title="Message Processed" /> : null}
          {status === 'error' ? (
            <Tooltip label={errorText}>
              <Badge status="error" title={errorText} />
            </Tooltip>
          ) : null}
          {status === 'warning' ? (
            <Tooltip label={errorText}>
              <Badge status="warning" title={errorText} />
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    {
      accessor: 'template',
      Header: 'Template Name',
      Cell: ({ template }: any) => (
        <Tooltip label={template.name}>
          <Text data-test-id="row-template-name" rows={1}>
            {template.name}
          </Text>
        </Tooltip>
      ),
    },
    {
      accessor: 'subscriber',
      Header: 'Subscriber',
      Cell: ({ subscriber }: any) => (
        <Text data-test-id="subscriber-name" rows={1}>
          {capitalize(subscriber.firstName)} {capitalize(subscriber.lastName)}
        </Text>
      ),
    },
    {
      accessor: 'recipient',
      Header: 'Recipient',
      Cell: ({ channel, email, phone }: any) => (
        <Text rows={1}>
          {channel === ChannelTypeEnum.EMAIL ? email : ''} {channel === ChannelTypeEnum.SMS ? phone : ''}
        </Text>
      ),
    },
    {
      accessor: 'channel',
      Header: 'Channel',
      Cell: ({ channel }: any) => (
        <>
          {channel === ChannelTypeEnum.EMAIL ? (
            <Tooltip label="Delivered on Email Channel">
              <Tag data-test-id="row-email-channel">Email</Tag>
            </Tooltip>
          ) : null}
          {channel === ChannelTypeEnum.IN_APP ? (
            <Tooltip label="Delivered on Inbox Channel">
              <Tag data-test-id="row-in-app-channel">In-App</Tag>
            </Tooltip>
          ) : null}
          {channel === ChannelTypeEnum.SMS ? (
            <Tooltip label="Delivered on SMS Channel">
              <Tag data-test-id="row-sms-channel">SMS</Tag>
            </Tooltip>
          ) : null}
        </>
      ),
    },
    {
      accessor: 'createdAt',
      Header: 'Sent On',
      Cell: ({ createdAt }: any) => {
        return moment(createdAt).isAfter(moment().subtract(1, 'day'))
          ? moment(createdAt).fromNow()
          : moment(createdAt).format('DD/MM/YYYY HH:mm');
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Activity Feed" />
      <ActivityStatistics />
      <ActivityGraph />
      <form onChange={handleSubmit(onFiltersChange)}>
        <Group>
          <Controller
            render={({ field }) => (
              <Select
                label="Channels"
                type="multiselect"
                placeholder="Select channel"
                data={[
                  { value: ChannelTypeEnum.SMS, label: 'SMS' },
                  { value: ChannelTypeEnum.EMAIL, label: 'Email' },
                  { value: ChannelTypeEnum.IN_APP, label: 'In-App' },
                ]}
                data-test-id="activities-filter"
                {...field}
              />
            )}
            control={control}
            name="channels"
          />
          <Controller
            render={({ field }) => (
              <Select
                label="Templates"
                type="multiselect"
                data-test-id="templates-filter"
                placeholder="Select template"
                data={(templates || []).map((template) => ({ value: template._id as string, label: template.name }))}
                {...field}
              />
            )}
            control={control}
            name="templates"
          />
          <Controller
            render={({ field }) => (
              <Input {...field} label="Search" placeholder="Select Email or ID" value={field.value || ''} />
            )}
            control={control}
            name="search"
          />
        </Group>
      </form>
      <Table
        data-test-id="activities-table"
        loading={isLoading || isFetching}
        data={data?.data || []}
        columns={columns}
        pagination={{
          pageSize: data?.pageSize,
          current: page,
          total: data?.totalCount,
          onPageChange: handleTableChange,
        }}>
        {' '}
      </Table>
    </PageContainer>
  );
}
