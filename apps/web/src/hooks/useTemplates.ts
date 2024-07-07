import { INotificationTemplate, isBridgeWorkflow, WorkflowIntegrationStatus, WorkflowTypeEnum } from '@novu/shared';
import { IUsePaginationQueryParamsStateOptions } from '@novu/design-system';

import { useEnvironment } from './useEnvironment';
import { getNotificationsList } from '../api/notification-templates';
import { usePaginatedQuery } from './usePaginatedQuery';

export type INotificationTemplateExtended = INotificationTemplate & {
  id: string;
  status: string;
  notificationGroup: { name: string };
  workflowIntegrationStatus?: WorkflowIntegrationStatus;
  bridge?: boolean;
};

/** allow override of paginated inputs */
export function useTemplates({
  pageIndex,
  pageSize,
  areSearchParamsEnabled = false,
}: {
  pageIndex?: IUsePaginationQueryParamsStateOptions['initialPageNumber'];
  pageSize?: IUsePaginationQueryParamsStateOptions['initialPageSize'];
} & Pick<IUsePaginationQueryParamsStateOptions, 'areSearchParamsEnabled'> = {}) {
  const { environment } = useEnvironment();

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
      ({ page, limit, query }) =>
      () =>
        getNotificationsList({ page, limit, query }),
    getTotalItemCount: (resp) => resp.totalCount,
    queryOptions: {
      keepPreviousData: true,
    },
    paginationOptions: {
      areSearchParamsEnabled,
      initialPageNumber: (pageIndex ?? 0) + 1,
      initialPageSize: pageSize,
    },
  });

  return {
    ...paginatedQueryResp,
    templates: data?.data.map((template) => {
      return {
        ...template,
        bridge: isBridgeWorkflow(template.type),
      };
    }),
    loading: isLoading,
    totalCount: data?.totalCount,
    totalItemCount,
    totalPageCount,
  };
}
