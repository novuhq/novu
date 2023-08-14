import { useQuery } from '@tanstack/react-query';
import { ChannelTypeEnum, INotificationTemplate } from '@novu/shared';

import { useEnvController } from './useEnvController';
import { getNotificationsList } from '../api/notification-templates';

export type INotificationTemplateExtended = INotificationTemplate & {
  id: string;
  status: string;
  notificationGroup: { name: string };
  activeIntegrationStatus?: { isActive: boolean; channels: { [key in ChannelTypeEnum]: boolean } };
};

export function useTemplates(page = 0, limit = 10) {
  const { environment } = useEnvController();
  const { data, isLoading, refetch } = useQuery<{
    data: INotificationTemplateExtended[];
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
    refetch,
  };
}
