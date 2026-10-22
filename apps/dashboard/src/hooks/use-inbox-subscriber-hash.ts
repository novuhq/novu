import { useQuery } from '@tanstack/react-query';
import { getInboxSubscriberHash } from '@/api/inbox-subscriber-hash';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useInboxSubscriberHash(subscriberId: string | undefined) {
  const { currentEnvironment } = useEnvironment();
  const { data, isSuccess } = useQuery({
    queryKey: [QueryKeys.inboxSubscriberHash, currentEnvironment?._id, subscriberId],
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      if (!subscriberId) {
        throw new Error('No subscriber id');
      }

      return getInboxSubscriberHash(currentEnvironment, subscriberId, signal);
    },
    enabled: !!currentEnvironment?._id && !!subscriberId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    subscriberHash: data?.subscriberHash,
    isReady: isSuccess && !!data?.subscriberHash,
  };
}
