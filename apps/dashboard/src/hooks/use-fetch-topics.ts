import { DirectionEnum } from '@novu/shared';
import { keepPreviousData, UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getTopics, ListTopicsResponse } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

interface UseTopicsParams {
  after?: string;
  before?: string;
  key?: string;
  name?: string;
  orderDirection?: DirectionEnum;
  orderBy?: string;
  limit?: number;
  includeCursor?: boolean;
}

export function useFetchTopics(
  {
    after = '',
    before = '',
    key = '',
    name = '',
    orderDirection = DirectionEnum.DESC,
    orderBy = '_id',
    limit = 10,
    includeCursor,
  }: UseTopicsParams = {},
  options: Omit<UseQueryOptions<ListTopicsResponse, Error>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();

  const topicsQuery = useQuery({
    queryKey: [
      QueryKeys.fetchTopics,
      currentEnvironment?._id,
      { after, before, limit, key, name, orderDirection, orderBy, includeCursor },
    ],
    queryFn: ({ signal }) =>
      getTopics({
        environment: currentEnvironment!,
        after,
        before,
        limit,
        key,
        name,
        orderDirection,
        orderBy,
        includeCursor,
        signal,
      }),
    placeholderData: keepPreviousData,
    enabled: !!currentEnvironment?._id,
    refetchOnWindowFocus: true,
    ...options,
  });

  return topicsQuery;
}
