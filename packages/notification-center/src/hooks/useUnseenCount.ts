import { useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import debounce from 'lodash.debounce';

import type { ICountData } from '../shared/interfaces';
import { useNovuContext } from './useNovuContext';
import { useSetQueryKey } from './useSetQueryKey';
import { useFetchNotificationsQueryKey } from './useFetchNotificationsQueryKey';
import { useUnseenCountQueryKey } from './useUnseenCountQueryKey';
import { useFeedUnseenCountQueryKey } from './useFeedUnseenCountQueryKey';

const dispatchUnseenCountEvent = (count: number) => {
  document.dispatchEvent(new CustomEvent('novu:unseen_count_changed', { detail: count }));
};

/**
 * TODO: This is a temporary fix
 * Cypress is slow, so we need to increase the debounce time
 * This is happening in a very high thruput of updates in testing env.
 *
 * Can also happen in real scenarios, so we need to review how we handle concurrency in the future
 */
const DEBOUNCE_TIME = typeof window !== 'undefined' && (window as any)?.Cypress ? 1000 : 100;

export const useUnseenCount = ({ onSuccess, ...restOptions }: UseQueryOptions<ICountData, Error, ICountData> = {}) => {
  const { apiService, socket, isSessionInitialized, fetchingStrategy } = useNovuContext();

  const queryClient = useQueryClient();
  const setQueryKey = useSetQueryKey();
  const fetchNotificationsQueryKey = useFetchNotificationsQueryKey();
  const unseenCountQueryKey = useUnseenCountQueryKey();
  const feedUnseenCountQueryKey = useFeedUnseenCountQueryKey();

  useEffect(() => {
    if (!socket) {
      return () => {};
    }

    socket.on(
      'unseen_count_changed',
      debounce((data?: { unseenCount: number }) => {
        if (Number.isInteger(data?.unseenCount)) {
          queryClient.setQueryData<{ count: number }>(unseenCountQueryKey, (oldData) => ({
            count: data?.unseenCount ?? oldData.count,
          }));

          queryClient.refetchQueries(unseenCountQueryKey, {
            exact: false,
          });
          queryClient.refetchQueries(fetchNotificationsQueryKey, {
            exact: false,
          });
          queryClient.refetchQueries(feedUnseenCountQueryKey, {
            exact: false,
          });

          dispatchUnseenCountEvent(data.unseenCount);
        }
      }, DEBOUNCE_TIME)
    );

    return () => {
      socket.off('unseen_count_changed');
    };
  }, [socket, queryClient, setQueryKey]);

  const result = useQuery<ICountData, Error, ICountData>(
    unseenCountQueryKey,
    () => apiService.getUnseenCount({ limit: 100 }),
    {
      ...restOptions,
      enabled: isSessionInitialized && fetchingStrategy.fetchUnseenCount,
      onSuccess: (data) => {
        dispatchUnseenCountEvent(data.count);
        onSuccess?.(data);
      },
    }
  );

  return result;
};
