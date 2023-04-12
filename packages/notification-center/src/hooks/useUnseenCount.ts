import { useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import debounce from 'lodash.debounce';

import type { ICountData } from '../shared/interfaces';
import { FEED_UNSEEN_COUNT_QUERY_KEY, INFINITE_NOTIFICATIONS_QUERY_KEY, UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useNovuContext } from './useNovuContext';

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
const DEBOUNCE_TIME = typeof window !== 'undefined' && (window as any)?.Cypress ? 500 : 100;

export const useUnseenCount = ({ onSuccess, ...restOptions }: UseQueryOptions<ICountData, Error, ICountData> = {}) => {
  const { apiService, socket, isSessionInitialized, fetchingStrategy } = useNovuContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      return () => {};
    }

    socket.on(
      'unseen_count_changed',
      debounce((data?: { unseenCount: number }) => {
        if (Number.isInteger(data?.unseenCount)) {
          queryClient.setQueryData<{ count: number }>(UNSEEN_COUNT_QUERY_KEY, (oldData) => ({
            count: data?.unseenCount ?? oldData.count,
          }));
          queryClient.refetchQueries(INFINITE_NOTIFICATIONS_QUERY_KEY, {
            exact: false,
          });
          queryClient.refetchQueries(FEED_UNSEEN_COUNT_QUERY_KEY, {
            exact: false,
          });
          dispatchUnseenCountEvent(data.unseenCount);
        }
      }, DEBOUNCE_TIME)
    );

    return () => {
      socket.off('unseen_count_changed');
    };
  }, [socket, queryClient]);

  const result = useQuery<ICountData, Error, ICountData>(UNSEEN_COUNT_QUERY_KEY, () => apiService.getUnseenCount(), {
    ...restOptions,
    enabled: isSessionInitialized && fetchingStrategy.fetchUnseenCount,
    onSuccess: (data) => {
      dispatchUnseenCountEvent(data.count);
      onSuccess?.(data);
    },
  });

  return result;
};
