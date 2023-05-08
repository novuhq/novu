import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import type { IStoreQuery } from '@novu/client';
import type { IMessage, IPaginatedResponse } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';
import { getNextPageParam } from '../utils/pagination';
import { useSetQueryKey } from './useSetQueryKey';

export const useFetchNotifications = (
  { query }: { query?: IStoreQuery },
  options: UseInfiniteQueryOptions<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const setQueryKey = useSetQueryKey();

  const result = useInfiniteQuery<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>>(
    setQueryKey([...INFINITE_NOTIFICATIONS_QUERY_KEY, query]),
    ({ pageParam = 0 }) => apiService.getNotificationsList(pageParam, query),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchNotifications,
      getNextPageParam,
    }
  );

  return result;
};
