import type { IEnvironment } from '@novu/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSubscriberSessionStats } from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';

export function useFetchSubscriberSessionStats(environment: IEnvironment, days: number, enabled = true) {
  return useQuery({
    queryKey: [QueryKeys.subscriberSessionStats, environment._id, days],
    queryFn: ({ signal }) => getSubscriberSessionStats({ environment, days, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
