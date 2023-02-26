import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';
import styled from '@emotion/styled';

import { useTemplates, useDebounce } from '../../hooks';
import { getActivityList } from '../../api/activity';
import PageContainer from '../../components/layout/components/PageContainer';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import { Select, Input, Button } from '../../design-system';
import { ActivityStatistics } from './components/ActivityStatistics';
import { ActivityGraph } from './components/ActivityGraph';
import { ActivityList } from './components/ActivityList';
import { ExecutionDetailsModal } from '../../components/execution-detail/ExecutionDetailsModal';
import { IActivityGraphStats } from './interfaces';

const FiltersContainer = styled.div`
  width: 80%;
  display: flex;
  align-items: center;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 15px;
  padding: 30px;
`;

interface IFiltersForm {
  channels: ChannelTypeEnum[];
  templates: string[];
  transactionId: string;
  search: string;
}

const initialFormState: IFiltersForm = {
  channels: [],
  templates: [],
  transactionId: '',
  search: '',
};

export function ActivitiesPage() {
  const { templates, loading: loadingTemplates } = useTemplates(0, 100);
  const [page, setPage] = useState<number>(0);
  const [isModalOpen, setToggleModal] = useState<boolean>(false);
  const [notificationId, setNotificationId] = useState<string>('');
  const [filters, setFilters] = useState<IFiltersForm>(initialFormState);
  const { data, isLoading, isFetching } = useQuery<{ data: any[]; totalCount: number; pageSize: number }>(
    ['activitiesList', page, filters],
    () => getActivityList(page, filters),
    { keepPreviousData: true }
  );

  function onFiltersChange(formData: Partial<IFiltersForm>) {
    setFilters((old) => ({ ...old, ...formData }));
  }

  const debouncedTransactionIdChange = useDebounce((transactionId: string) => {
    onFiltersChange({ transactionId });
  }, 500);

  const debouncedSearchChange = useDebounce((search: string) => {
    onFiltersChange({ search });
  }, 500);

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  const {
    control,
    setValue,
    reset,
    formState: { isDirty },
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
    <PageContainer>
      <PageMeta title="Activity Feed" />
      <PageHeader title="Activity Feed" />
      <ActivityStatistics />
      <ActivityGraph onBarClick={onBarClick} />
      <form>
        <FiltersContainer>
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
                    { value: ChannelTypeEnum.PUSH, label: 'Push' },
                  ]}
                  data-test-id="activities-filter"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    onFiltersChange({ channels: value as ChannelTypeEnum[] });
                  }}
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
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    onFiltersChange({ templates: value as string[] });
                  }}
                />
              )}
              control={control}
              name="templates"
            />
          </div>
          <div style={{ minWidth: '250px' }}>
            <Controller
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  error={fieldState.error?.message}
                  label="Transaction ID"
                  placeholder="Search by transaction id"
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e);
                    debouncedTransactionIdChange(e.target.value);
                  }}
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
                  label="Search"
                  placeholder="Select Email or ID"
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e);
                    debouncedSearchChange(e.target.value);
                  }}
                  data-test-id="search-filter"
                />
              )}
              control={control}
              name="search"
            />
          </div>
          {isDirty && (
            <Button variant="outline" size="md" mt={30} onClick={onClearClick} data-test-id="clear-filters">
              Clear
            </Button>
          )}
        </FiltersContainer>
      </form>
      <ActivityList
        loading={isLoading || isFetching}
        data={data?.data || []}
        onRowClick={onRowClick}
        pagination={{
          pageSize: data?.pageSize,
          current: page,
          total: data?.totalCount,
          onPageChange: handleTableChange,
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
