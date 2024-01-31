import { useQuery } from '@tanstack/react-query';
import { INotificationTemplate, WorkflowIntegrationStatus } from '@novu/shared';

import { useEnvController } from './useEnvController';
import { getNotificationsList } from '../api/notification-templates';

export type INotificationTemplateExtended = INotificationTemplate & {
  id: string;
  status: string;
  notificationGroup: { name: string };
  workflowIntegrationStatus?: WorkflowIntegrationStatus;
};

export function useTemplates(pageIndex = 0, pageSize = 10) {
  const { environment } = useEnvController();
  const { data, isLoading, refetch } = useQuery<{
    data: INotificationTemplateExtended[];
    totalCount: number;
    pageSize: number;
  }>(['notificationsList', environment?._id, pageIndex, pageSize], () => getNotificationsList(pageIndex, pageSize), {
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
