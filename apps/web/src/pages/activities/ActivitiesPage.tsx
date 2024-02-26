import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';
import styled from '@emotion/styled';

import { useTemplates, useDebounce } from '../../hooks';
import { getActivityList } from '../../api/activity';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { Select, Input, Button } from '@novu/design-system';
import { ActivityStatistics } from './components/ActivityStatistics';
import { ActivityGraph } from './components/ActivityGraph';
import { ActivityList } from './components/ActivityList';
import { ExecutionDetailsModal } from '../../components/execution-detail/ExecutionDetailsModal';
import { IActivityGraphStats } from './interfaces';
import { Flex } from '@mantine/core';
import { FIRST_100_WORKFLOWS } from '../../constants/workflowConstants';

const FiltersContainer = styled.div`
  gap: 15px;
  padding: 30px;
`;

interface IFiltersForm {
  channels: ChannelTypeEnum[];
  templates: string[];
  transactionId: string;
  email: string;
  subscriberId: string;
}

const initialFormState: IFiltersForm = {
  channels: [],
  templates: [],
  transactionId: '',
  email: '',
  subscriberId: '',
};

export function ActivitiesPage() {
  const { templates, loading: loadingTemplates } = useTemplates(FIRST_100_WORKFLOWS);
  const [page, setPage] = useState<number>(0);
  const [isModalOpen, setToggleModal] = useState<boolean>(false);
  const [notificationId, setNotificationId] = useState<string>('');
  const [filters, setFilters] = useState<IFiltersForm>(initialFormState);
  const { data, isLoading, isFetching } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(
    ['activitiesList', page, filters],
    () => getActivityList(page, filters),
    { keepPreviousData: true }
  );

  function onFiltersChange(formData: Partial<IFiltersForm>) {
    setFilters((old) => ({ ...old, ...formData }));
  }

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const {
    control,
    setValue,
    reset,
    formState: { isDirty },
    getValues,
  } = useForm<IFiltersForm>({
    defaultValues: initialFormState,
  });

  function onRowClick(event, selectedNotificationId) {
    event.preventDefault();
    setNotificationId(selectedNotificationId);
    setToggleModal((state) => !state);
  }

  function onModalClose() {
    setNotificationId('');
    setToggleModal(false);
  }

  const onBarClick = (item: IActivityGraphStats) => {
    setValue('channels', item.channels, { shouldDirty: true });
    setValue('templates', item.templates, { shouldDirty: true });
    onFiltersChange({ channels: item.channels, templates: item.templates });
  };

  const onClearClick = () => {
    reset(initialFormState);
    onFiltersChange(initialFormState);
  };

  return (
    <PageContainer title="Activity Feed">
      <PageHeader title="Activity Feed" />
      <ActivityStatistics />
      <ActivityGraph onBarClick={onBarClick} />
      <form>
        <FiltersContainer>
          <Flex mih={50} gap="md" justify="flex-start" align="flex-start" direction="row" wrap="wrap">
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
                    { value: ChannelTypeEnum.PUSH, label: 'Push' },
                  ]}
                  data-test-id="activities-filter"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                />
              )}
              control={control}
              name="channels"
            />
            <Controller
              render={({ field }) => (
                <Select
                  label="Workflows"
                  type="multiselect"
                  data-test-id="templates-filter"
                  loading={loadingTemplates}
                  placeholder="Select workflow"
                  data={(templates || []).map((template) => ({
                    value: template._id as string,
                    label: template.name,
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                />
              )}
              control={control}
              name="templates"
            />
            <div style={{ minWidth: '250px' }}>
              <Controller
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    error={fieldState.error?.message}
                    label="Transaction ID"
                    placeholder="Search by transaction id"
                    value={field.value || ''}
                    data-test-id="transactionId-filter"
                  />
                )}
                control={control}
                name="transactionId"
              />
            </div>

            <div style={{ minWidth: '250px' }}>
              <Controller
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    error={fieldState.error?.message}
                    label="E-mail"
                    placeholder="Search by subscriber email"
                    value={field.value || ''}
                    data-test-id="email-filter"
                  />
                )}
                control={control}
                name="email"
              />
            </div>
            <div style={{ minWidth: '250px' }}>
              <Controller
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    error={fieldState.error?.message}
                    label="Subscriber ID"
                    placeholder="Search by subscriberId"
                    value={field.value || ''}
                    data-test-id="subscriberId-filter"
                  />
                )}
                control={control}
                name="subscriberId"
              />
            </div>
            <div style={{ paddingTop: 10, marginLeft: 'auto' }}>
              <Button
                variant="subtle"
                size="md"
                mt={30}
                onClick={onClearClick}
                data-test-id="clear-filters"
                disabled={!isDirty}
                style={{ marginRight: 15 }}
              >
                Clear
              </Button>
              <Button
                variant="gradient"
                loading={isLoading || isLoading}
                size="md"
                mt={30}
                onClick={() => onFiltersChange(getValues())}
                data-test-id="submit-filters"
              >
                Search
              </Button>
            </div>
          </Flex>
        </FiltersContainer>
      </form>
      <ActivityList
        loading={isLoading || isFetching}
        data={data?.data || []}
        onRowClick={onRowClick}
        pagination={{
          pageSize: data?.pageSize,
          current: page,
          onPageChange: handleTableChange,
          minimalPagination: true,
          hasMore: data?.hasMore,
        }}
      />
      <ExecutionDetailsModal
        onViewDigestExecution={setNotificationId}
        notificationId={notificationId}
        modalVisibility={isModalOpen}
        onClose={onModalClose}
      />
    </PageContainer>
  );
}
