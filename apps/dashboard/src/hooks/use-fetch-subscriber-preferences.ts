import { getSubscriberPreferences } from '@/api/subscribers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export type GetSubscriberPreferencesResponse = Awaited<ReturnType<typeof getSubscriberPreferences>>;

type Props = {
  subscriberId: string;
  options?: Omit<UseQueryOptions<GetSubscriberPreferencesResponse, Error>, 'queryKey' | 'queryFn'>;
};

export default function useFetchSubscriberPreferences({ subscriberId, options = {} }: Props) {
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const subscriberQuery = useQuery<GetSubscriberPreferencesResponse>({
    queryKey: [QueryKeys.fetchSubscriberPreferences, currentOrganization?._id, currentEnvironment?._id, subscriberId],
    queryFn: () => getSubscriberPreferences({ environment: currentEnvironment!, subscriberId }),
    enabled: !!currentOrganization,
    ...options,
  });

  return subscriberQuery;
}
