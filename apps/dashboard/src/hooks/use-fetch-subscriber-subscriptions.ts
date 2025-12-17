import { useQuery } from '@tanstack/react-query';
import { getSubscriberSubscriptions } from '@/api/subscribers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useFetchSubscriberSubscriptions({
  subscriberId,
  limit = 10,
  page,
}: {
  subscriberId: string;
  limit?: number;
  page?: number;
}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchSubscriberSubscriptions, currentEnvironment?._id, subscriberId, limit, page],
    queryFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'Environment is required');

      return await getSubscriberSubscriptions({
        environment,
        subscriberId,
        limit,
      });
    },
    enabled: !!currentEnvironment && !!subscriberId,
  });
}
