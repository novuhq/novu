import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import type { IActivity } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { getNotification } from '@/api/activity';

export function useFetchActivity(
  { activityId }: { activityId?: string | null },
  {
    refetchInterval = false,
    refetchOnWindowFocus = false,
    staleTime = 0,
  }: { refetchInterval?: number | false; refetchOnWindowFocus?: boolean; staleTime?: number } = {}
) {
  const { currentEnvironment } = useEnvironment();

  const { data, isPending, error } = useQuery<IActivity>({
    queryKey: [QueryKeys.fetchActivity, currentEnvironment?._id, activityId],
    queryFn: () => getNotification(activityId!, currentEnvironment!),
    enabled: !!currentEnvironment?._id && !!activityId,
    refetchInterval,
    refetchOnWindowFocus,
    staleTime,
  });

  return {
    activity: data,
    isPending,
    error,
  };
}
