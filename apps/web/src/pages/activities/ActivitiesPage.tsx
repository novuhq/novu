import { useState, useEffect } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { useQuery } from 'react-query';
import { Controller, useForm } from 'react-hook-form';
import { useTemplates } from '../../api/hooks/use-templates';
import { getActivityList } from '../../api/activity';
import PageContainer from '../../components/layout/components/PageContainer';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import { Select, Input } from '../../design-system';
import { ActivityStatistics } from './components/ActivityStatistics';
import { ActivityGraph } from './components/ActivityGraph';
import { ActivityList } from './components/ActivityList';
import { ExecutionDetailsModal } from '../../components/activity/ExecutionDetailsModal';

interface IFiltersForm {
  channels?: ChannelTypeEnum[];
}

export function ActivitiesPage() {
  const { templates, loading: loadingTemplates } = useTemplates(0, 100);
  const [page, setPage] = useState<number>(0);
  const [isModalOpen, setToggleModal] = useState<boolean>(false);
  const [notificationId, setNotificationId] = useState<string>('');
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

  function onRowClick(event, selectedNotificationId) {
    event.preventDefault();
    setNotificationId(selectedNotificationId);
    setToggleModal((state) => !state);
  }

  function onModalClose() {
    setNotificationId('');
    setToggleModal(false);
  }

  return (
    <PageContainer>
      <PageMeta title="Activity Feed" />
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
                    { value: ChannelTypeEnum.PUSH, label: 'Push' },
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
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  error={fieldState.error?.message}
                  label="Transaction ID"
                  placeholder="Search by transaction id"
                  value={field.value || ''}
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
                />
              )}
              control={control}
              name="search"
            />
          </div>
        </div>
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
