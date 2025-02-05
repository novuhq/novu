import { getSubscribers } from '@/api/subscribers';
import { QueryKeys } from '@/utils/query-keys';
import { DirectionEnum } from '@novu/shared';
import { keepPreviousData, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useEnvironment } from '../context/environment/hooks';

interface UseSubscribersParams {
  after?: string;
  before?: string;
  email?: string;
  phone?: string;
  orderDirection?: DirectionEnum;
  orderBy?: string;
  name?: string;
  subscriberId?: string;
  limit?: number;
}

type SubscribersResponse = Awaited<ReturnType<typeof getSubscribers>>;

export function useFetchSubscribers(
  {
    after = '',
    before = '',
    email = '',
    phone = '',
    orderDirection = DirectionEnum.DESC,
    orderBy = '_id',
    name = '',
    subscriberId = '',
    limit = 10,
  }: UseSubscribersParams = {},
  options: Omit<UseQueryOptions<SubscribersResponse, Error>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();

  const subscribersQuery = useQuery({
    queryKey: [
      QueryKeys.fetchSubscribers,
      currentEnvironment?._id,
      { after, before, limit, email, phone, subscriberId, name, orderDirection, orderBy },
    ],
    queryFn: () =>
      getSubscribers({
        environment: currentEnvironment!,
        after,
        before,
        limit,
        email,
        phone,
        subscriberId,
        name,
        orderDirection,
        orderBy,
      }),
    placeholderData: keepPreviousData,
    enabled: !!currentEnvironment?._id,
    refetchOnWindowFocus: true,
    ...options,
  });

  return subscribersQuery;
}
