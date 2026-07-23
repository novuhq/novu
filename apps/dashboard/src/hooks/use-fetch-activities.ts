import { IActivity } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';

import { ActivityFilters, getActivityList } from '@/api/activity';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '../context/environment/hooks';

interface UseActivitiesOptions {
  filters?: ActivityFilters;
  page?: number;
  limit?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface ActivityResponse {
  data: IActivity[];
  hasMore: boolean;
  pageSize: number;
  next?: string | null;
  previous?: string | null;
}

export function useFetchActivities(
  { filters, page = 0, limit = 10 }: UseActivitiesOptions = {},
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

  const { data, ...rest } = useQuery<ActivityResponse>({
    queryKey: [QueryKeys.fetchActivities, currentEnvironment?._id, page, limit, filters],
    queryFn: async ({ signal }) => {
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
