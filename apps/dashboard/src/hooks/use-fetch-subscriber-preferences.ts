import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getSubscriberPreferences } from '@/api/subscribers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export type GetSubscriberPreferencesResponse = Awaited<ReturnType<typeof getSubscriberPreferences>>;

type Props = {
  subscriberId: string;
  contextKeys?: string[];
  options?: Omit<UseQueryOptions<GetSubscriberPreferencesResponse, Error>, 'queryKey' | 'queryFn'>;
};

export default function useFetchSubscriberPreferences({ subscriberId, contextKeys, options = {} }: Props) {
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const subscriberQuery = useQuery<GetSubscriberPreferencesResponse>({
    queryKey: [
      QueryKeys.fetchSubscriberPreferences,
      currentOrganization?._id,
      currentEnvironment?._id,
      subscriberId,
      contextKeys,
    ],
    queryFn: () => getSubscriberPreferences({ environment: currentEnvironment!, subscriberId, contextKeys }),
    enabled: !!currentOrganization,
    ...options,
  });

  return subscriberQuery;
}
