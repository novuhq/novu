import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import type { IStoreQuery } from '@novu/client';
import type { IMessage, IPaginatedResponse } from '@novu/shared';

import { useNovuContext } from './use-novu-context.hook';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';

export const useFetchNotifications = (
  { query }: { query?: IStoreQuery },
  options: UseInfiniteQueryOptions<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>> = {}
) => {
  const { apiService, isSessionInitialized } = useNovuContext();

  const result = useInfiniteQuery<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>>(
    [...INFINITE_NOTIFICATIONS_QUERY_KEY, query],
    ({ pageParam = 0 }) => apiService.getNotificationsList(pageParam, query),
    {
      ...options,
      enabled: isSessionInitialized,
      getNextPageParam: (lastPage) =>
        (lastPage.page + 1) * lastPage.pageSize < lastPage.totalCount ? lastPage.page + 1 : undefined,
    }
  );

  return result;
};
