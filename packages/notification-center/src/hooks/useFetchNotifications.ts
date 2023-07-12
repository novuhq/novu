import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import type { IStoreQuery } from '@novu/client';
import type { IMessage, IPaginatedResponse } from '@novu/shared';
import { INotificationsContext } from '../shared/interfaces';

import { useNovuContext } from './useNovuContext';
import { getNextPageParam } from '../utils/pagination';
import { useFetchNotificationsQueryKey } from './useFetchNotificationsQueryKey';

export const useFetchNotifications = (
  { query }: { query?: IStoreQuery } = {},
  options: UseInfiniteQueryOptions<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const fetchNotificationsQueryKey = useFetchNotificationsQueryKey();

  const result = useInfiniteQuery<IPaginatedResponse<IMessage>, Error, IPaginatedResponse<IMessage>>(
    fetchNotificationsQueryKey,
    ({ pageParam = 0 }) => apiService.getNotificationsList(pageParam, query),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchNotifications,
      getNextPageParam,
    }
  );

  const refetch: INotificationsContext['refetch'] = ({ page, ...otherOptions } = {}) => {
    if (page !== undefined) {
      result.fetchNextPage({ pageParam: page, ...otherOptions });
    } else {
      result.refetch(otherOptions);
    }
  };

  return {
    ...result,
    refetch,
  };
};
