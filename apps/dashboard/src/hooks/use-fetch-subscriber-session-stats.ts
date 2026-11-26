import type { IEnvironment } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getSubscriberSessionStats } from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';

export function useFetchSubscriberSessionStats(environment: IEnvironment, days: number, enabled = true) {
  return useQuery({
    queryKey: [QueryKeys.subscriberSessionStats, environment._id, days],
    queryFn: ({ signal }) => getSubscriberSessionStats({ environment, days, signal }),
    // Keep the table steady while 7/30 switches, but never show another environment's counts.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === environment._id ? previous : undefined,
    enabled,
  });
}
