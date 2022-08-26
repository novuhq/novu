import { useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { getNotificationsList } from '../notifications';
import { useEnvController } from '../../store/use-env-controller';

export function useTemplates(page = 0, usePagination = false) {
  const { environment } = useEnvController();
  const { data, isLoading } = useQuery<{
    data: INotificationTemplate[];
    totalCount: number;
    pageSize: number;
  }>(['notificationsList', environment?._id, page, usePagination], () => getNotificationsList(page, usePagination), {
    keepPreviousData: true,
  });

  return {
    templates: data?.data,
    loading: isLoading,
    totalCount: data?.totalCount,
    pageSize: data?.pageSize,
  };
}
