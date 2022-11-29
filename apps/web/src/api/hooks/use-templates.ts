import { useQuery } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { getNotificationsList } from '../notifications';
import { useEnvController } from '../../store/use-env-controller';

export function useTemplates(page = 0, limit = 10) {
  const { environment } = useEnvController();
  const { data, isLoading } = useQuery<{
    data: INotificationTemplate[];
    totalCount: number;
    pageSize: number;
  }>(['notificationsList', environment?._id, page, limit], () => getNotificationsList(page, limit), {
    keepPreviousData: true,
  });

  return {
    templates: data?.data,
    loading: isLoading,
    totalCount: data?.totalCount,
    pageSize: data?.pageSize,
  };
}
