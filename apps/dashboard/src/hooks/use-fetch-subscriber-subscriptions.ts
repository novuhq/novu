import { useQuery } from '@tanstack/react-query';
import { getSubscriberSubscriptions } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';

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
    queryKey: ['subscriberSubscriptions', subscriberId, limit, page],
    queryFn: async () => {
      if (!currentEnvironment) return null;

      return await getSubscriberSubscriptions({
        environment: currentEnvironment,
        subscriberId,
        limit,
      });
    },
    enabled: !!currentEnvironment && !!subscriberId,
  });
}
