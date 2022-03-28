import React, { useState, useEffect } from 'react';
import { ChannelTypeEnum } from '@notifire/shared';
import { useQuery } from 'react-query';
import { ColumnWithStrictAccessor } from 'react-table';
import moment from 'moment';
import { Controller, useForm } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { Badge } from '@mantine/core';
import styled from '@emotion/styled';
import { useTemplates } from '../../api/hooks/use-templates';
import { getActivityList } from '../../api/activity';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { Data, Table } from '../../design-system/table/Table';
import { Select, Tag, Text, Tooltip, Input, colors } from '../../design-system';
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

  const { handleSubmit, control, watch } = useForm({});

  useEffect(() => {
    const subscription = watch((values) => handleSubmit(onFiltersChange)());

    return () => subscription.unsubscribe();
  }, [watch]);

  const columns: ColumnWithStrictAccessor<Data>[] = [
    {
      accessor: 'status',
      Header: '',
      maxWidth: 10,
      width: 10,
      Cell: ({ status, errorText }: any) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {status === 'sent' ? <StatusBadge status="success" data-test-id={'status-badge'} /> : null}
          {status === 'error' ? (
            <Tooltip label={errorText}>
              <StatusBadge status="error" data-test-id={'status-badge'} />
            </Tooltip>
          ) : null}
          {status === 'warning' ? (
            <Tooltip label={errorText}>
              <StatusBadge status="error" data-test-id={'status-badge'} />
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
      <form>
        <div style={{ width: '80%', display: 'flex', flexDirection: 'row', gap: '15px', padding: '30px' }}>
          <div style={{ minWidth: '250px' }}>
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
          </div>
          <div style={{ minWidth: '250px' }}>
            <Controller
              render={({ field }) => (
                <Select
                  label="Templates"
                  type="multiselect"
                  data-test-id="templates-filter"
                  loading={loadingTemplates}
                  placeholder="Select template"
                  data={(templates || []).map((template) => ({ value: template._id as string, label: template.name }))}
                  {...field}
                />
              )}
              control={control}
              name="templates"
            />
          </div>
          <div style={{ minWidth: '250px' }}>
            <Controller
              render={({ field }) => (
                <Input {...field} label="Search" placeholder="Select Email or ID" value={field.value || ''} />
              )}
              control={control}
              name="search"
            />
          </div>
        </div>
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

const StatusBadge = styled.div<{ status: 'success' | 'error' | 'warning' }>`
  display: inline-block;
  width: 6px;
  min-width: 6px;
  height: 6px;
  border-radius: 100%;

  background-color: ${({ status }) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'warning':
        return '#eca237';
      case 'error':
        return colors.error;
      default:
        return '#b2b2b2';
    }
  }};
`;
