import { INotificationTemplate, WorkflowIntegrationStatus, NotificationTemplateTypeEnum } from '@novu/shared';
import { IUsePaginationStateOptions } from '@novu/design-system';

import { useEnvController } from './useEnvController';
import { getNotificationsList } from '../api/notification-templates';
import { usePaginatedQuery } from './usePaginatedQuery';

export type INotificationTemplateExtended = INotificationTemplate & {
  id: string;
  status: string;
  notificationGroup: { name: string };
  workflowIntegrationStatus?: WorkflowIntegrationStatus;
  chimera?: boolean;
};

/** allow override of paginated inputs */
export function useTemplates({
  pageIndex,
  pageSize,
  areSearchParamsEnabled = false,
}: {
  pageIndex?: IUsePaginationStateOptions['startingPageNumber'];
  pageSize?: IUsePaginationStateOptions['startingPageSize'];
} & Pick<IUsePaginationStateOptions, 'areSearchParamsEnabled'> = {}) {
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
        getNotificationsList(ctxPageIndex, ctxPageSize),
    getTotalItemCount: (resp) => resp.totalCount,
    queryOptions: {
      keepPreviousData: true,
    },
    paginationOptions: {
      areSearchParamsEnabled,
      startingPageNumber: (pageIndex ?? 0) + 1,
      startingPageSize: pageSize,
    },
  });

  return {
    ...paginatedQueryResp,
    templates: data?.data.map((template) => {
      return {
        ...template,
        chimera: template.type === NotificationTemplateTypeEnum.ECHO,
      };
    }),
    loading: isLoading,
    totalCount: data?.totalCount,
    totalItemCount,
    totalPageCount,
  };
}
