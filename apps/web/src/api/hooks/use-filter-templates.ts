import { useQuery } from '@tanstack/react-query';
import { INotificationTemplate } from '@novu/shared';

import { getNotificationsList } from '../notifications';
import { useEnvController } from '../../store/useEnvController';

export function useFilterTemplates(searchQuery = '', page = 0) {
  const { environment } = useEnvController();
  const { data: tempData, isLoading: isTempLoading } = useQuery<{
    data: INotificationTemplate[];
    totalCount: number;
    pageSize: number;
  }>(['notificationsList', environment?._id, page], () => getNotificationsList(page), {
    keepPreviousData: true,
  });

  const { data, isLoading } = useQuery<{
    data: INotificationTemplate[];
    totalCount: number;
    pageSize: number;
  }>(
    ['notificationsList', environment?._id, 0, isTempLoading ? 10 : tempData?.totalCount],
    () => getNotificationsList(0, isTempLoading ? 10 : tempData?.totalCount),
    {
      keepPreviousData: true,
    }
  );

  const filteredData = data?.data
    .filter((template) => template.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const paginatedData = filteredData?.slice(page * 10, (page + 1) * 10);

  if (searchQuery === '' || isTempLoading)
    return {
      templates: tempData?.data,
      loading: isTempLoading,
      totalCount: tempData?.totalCount,
      pageSize: tempData?.pageSize,
    };

  return {
    templates: paginatedData,
    loading: isLoading && isTempLoading,
    totalCount: data?.totalCount,
    pageSize: data?.pageSize,
  };
}
