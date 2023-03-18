import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePickerValue } from '@mantine/dates';
import { useTemplates } from '../../hooks';
import { IChartData } from './interfaces';
import PageContainer from '../../components/layout/components/PageContainer';
import PageMeta from '../../components/layout/components/PageMeta';
import { Title } from '../../design-system';
import { ActivityStatistics } from './components/ActivityStatistics';
import { ActivityGraph } from './components/ActivityGraph';
import { ActivityList } from './components/ActivityList';
import { ExecutionDetailsModal } from '../../components/execution-detail/ExecutionDetailsModal';
import { Group } from '@mantine/core';
import { loadActivityList, loadActivityChartData, mockChartData } from './services/data-loader';
import { subDays, subMonths } from 'date-fns';
import { ChannelTypeEnum, PeriodicityEnum } from '@novu/shared';
import { ActivityFilters } from './components/ActivityFilters';

export function ActivitiesPage() {
  interface IFiltersForm {
    templates: string[];
    channels: ChannelTypeEnum[];
    search: string;
    transactionId: string;
    range: DateRangePickerValue;
    periodicity: PeriodicityEnum;
  }

  const initialFormState: IFiltersForm = {
    templates: [],
    channels: [],
    search: '',
    transactionId: '',
    range: [subMonths(new Date(), 3), new Date()],
    periodicity: PeriodicityEnum.DAILY,
  };

  const { templates, loading: loadingTemplates } = useTemplates(0, 100);
  const [page, setPage] = useState<number>(0);
  const [isModalOpen, setToggleModal] = useState<boolean>(false);
  const [notificationId, setNotificationId] = useState<string>('');
  const [filters, setFilters] = useState<IFiltersForm>(initialFormState);
  const { data, isLoading, isFetching } = useQuery<{ data: any[]; totalCount: number; pageSize: number }>(
    ['activitiesList', page, filters],
    () => loadActivityList(page, filters),
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );
  const {
    data: chartData,
    isPlaceholderData,
    isLoading: graphLoading,
    isFetching: graphFetching,
  } = useQuery<IChartData>(['activityGraphStats', filters], () => loadActivityChartData(filters, false), {
    placeholderData: mockChartData,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  async function onFiltersChange(formData: Partial<IFiltersForm>) {
    setFilters((old) => ({ ...old, ...formData }));
  }

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

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
      <Group sx={{ paddingLeft: '30px' }}>
        <Title size={1}>Activity Feed</Title>
        <ActivityStatistics />
      </Group>
      <ActivityGraph
        filterState={filters}
        onFiltersChange={onFiltersChange}
        chartData={chartData}
        isPlaceholderData={isPlaceholderData}
      />
      <ActivityFilters templates={templates} filterState={filters} onFiltersChange={onFiltersChange} />
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
      <ExecutionDetailsModal notificationId={notificationId} modalVisibility={isModalOpen} onClose={onModalClose} />
    </PageContainer>
  );
}
