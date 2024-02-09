import { INotificationTemplate, WorkflowIntegrationStatus } from '@novu/shared';

import { useEnvController } from './useEnvController';
import { getNotificationsList } from '../api/notification-templates';
import { usePaginatedQuery } from './usePaginatedQuery';

export type INotificationTemplateExtended = INotificationTemplate & {
  id: string;
  status: string;
  notificationGroup: { name: string };
  workflowIntegrationStatus?: WorkflowIntegrationStatus;
};

/** allow override of paginated inputs */
export function useTemplates(pageIndex?: number, pageSize?: number) {
  const { environment } = useEnvController();

  const {
    data,
    isLoading,
    totalItemCount = 0,
    totalPageCount = 0,
    ...paginatedQueryResp
  } = usePaginatedQuery<{
    data: INotificationTemplateExtended[];
    totalCount: number;
    pageSize: number;
  }>({
    queryKey: ['notification-templates', environment?._id],
    buildQueryFn:
      ({ pageIndex: ctxPageIndex, pageSize: ctxPageSize }) =>
      () =>
        getNotificationsList(pageIndex ?? ctxPageIndex, pageSize ?? ctxPageSize),
    getTotalItemCount: (resp) => resp.totalCount,
    queryOptions: {
      keepPreviousData: true,
    },
  });

  return {
    ...paginatedQueryResp,
    templates: data?.data,
    loading: isLoading,
    totalCount: data?.totalCount,
    totalItemCount,
    totalPageCount,
  };
}
