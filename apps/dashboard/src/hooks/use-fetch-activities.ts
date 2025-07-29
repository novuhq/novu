import { useQuery } from '@tanstack/react-query';
import { IActivity, FeatureFlagsKeysEnum } from '@novu/shared';

import { getActivityList, getWorkflowRunsList, ActivityFilters } from '@/api/activity';
import { useEnvironment } from '../context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { QueryKeys } from '@/utils/query-keys';

interface UseActivitiesOptions {
  filters?: ActivityFilters;
  page?: number;
  limit?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  cursor?: string | null;
}

interface ActivityResponse {
  data: IActivity[];
  hasMore: boolean;
  pageSize: number;
  next?: string | null;
  previous?: string | null;
}

export function useFetchActivities(
  { filters, page = 0, limit = 10, cursor }: UseActivitiesOptions = {},
  {
    enabled = true,
    refetchInterval = false,
    refetchOnWindowFocus = false,
    staleTime = 0,
  }: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  } = {}
) {
  const { currentEnvironment } = useEnvironment();
  const isWorkflowRunMigrationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED);

  const { data, ...rest } = useQuery<ActivityResponse>({
    queryKey: [
      QueryKeys.fetchActivities,
      currentEnvironment?._id,
      page,
      limit,
      filters,
      isWorkflowRunMigrationEnabled,
      cursor,
    ],
    queryFn: async ({ signal }) => {
      if (isWorkflowRunMigrationEnabled) {
        const workflowRunsResponse = await getWorkflowRunsList({
          environment: currentEnvironment!,
          ...(cursor ? {} : { page }), // Only include page if no cursor
          limit,
          filters,
          signal,
          cursor,
        });
        return workflowRunsResponse;
      }

      return getActivityList({
        environment: currentEnvironment!,
        page,
        limit,
        filters,
        signal,
      });
    },
    staleTime,
    refetchOnWindowFocus,
    refetchInterval,
    enabled: enabled && !!currentEnvironment,
  });

  return {
    activities: data?.data || [],
    hasMore: data?.hasMore || false,
    next: data?.next,
    previous: data?.previous,
    ...rest,
    page,
  };
}
