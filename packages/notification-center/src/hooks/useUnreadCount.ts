import { useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import { WebSocketEventEnum } from '@novu/shared';

import type { ICountData } from '../shared/interfaces';
import { useNovuContext } from './useNovuContext';
import { useSetQueryKey } from './useSetQueryKey';
import { useFetchNotificationsQueryKey } from './useFetchNotificationsQueryKey';
import { useUnseenCountQueryKey } from './useUnseenCountQueryKey';
import { useDataRef } from './useDataRef';
import { FEED_UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useUnreadCountQueryKey } from './useUnreadCountQueryKey';

const dispatchUnreadCountEvent = (count: number) => {
  document.dispatchEvent(new CustomEvent('novu:unread_count_changed', { detail: count }));
};

/**
 * TODO: This is a temporary fix
 * Cypress is slow, so we need to increase the debounce time
 * This is happening in a very high thruput of updates in testing env.
 *
 * Can also happen in real scenarios, so we need to review how we handle concurrency in the future
 */
const DEBOUNCE_TIME = typeof window !== 'undefined' && (window as any)?.Cypress ? 1000 : 100;

export const useUnreadCount = ({ onSuccess, ...restOptions }: UseQueryOptions<ICountData, Error, ICountData> = {}) => {
  const { apiService, socket, isSessionInitialized, fetchingStrategy } = useNovuContext();

  const queryClient = useQueryClient();
  const setQueryKey = useSetQueryKey();
  const fetchNotificationsQueryKey = useFetchNotificationsQueryKey();
  const unreadCountQueryKey = useUnreadCountQueryKey();
  const unseenCountQueryKey = useUnseenCountQueryKey();
  const queryKeysRef = useDataRef({ fetchNotificationsQueryKey, unreadCountQueryKey, unseenCountQueryKey });

  useEffect(() => {
    if (!socket) {
      return () => {};
    }

    socket.on(
      WebSocketEventEnum.UNREAD,
      debounce((data?: { unreadCount: number }) => {
        if (Number.isInteger(data?.unreadCount)) {
          queryClient.setQueryData<{ count: number }>(queryKeysRef.current.unreadCountQueryKey, (oldData) => ({
            count: data?.unreadCount ?? oldData.count,
          }));

          // when unread count changes, we need to refetch unseen count
          queryClient.refetchQueries(queryKeysRef.current.unseenCountQueryKey, {
            exact: false,
          });
          queryClient.refetchQueries(queryKeysRef.current.fetchNotificationsQueryKey, {
            exact: false,
          });
          // refetch all feeds unseen count that is shown on the tabs
          queryClient.refetchQueries([...FEED_UNSEEN_COUNT_QUERY_KEY], {
            exact: false,
          });

          dispatchUnreadCountEvent(data.unreadCount);
        }
      }, DEBOUNCE_TIME)
    );

    return () => {
      socket.off(WebSocketEventEnum.UNREAD);
    };
  }, [socket, queryClient, setQueryKey]);

  const result = useQuery<ICountData, Error, ICountData>(
    unreadCountQueryKey,
    () => apiService.getUnreadCount({ limit: 100 }),
    {
      ...restOptions,
      enabled: isSessionInitialized && fetchingStrategy.fetchUnreadCount,
      onSuccess: (data) => {
        dispatchUnreadCountEvent(data.count);
        onSuccess?.(data);
      },
    }
  );

  return result;
};
