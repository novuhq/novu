import { checkNotificationMatchesFilter, isSameFilter, Notification, NotificationFilter, NovuError } from '@novu/js';
import { useCallback, useEffect, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useWebSocketEvent } from './internal/useWebsocketEvent';
import { useNovu } from './NovuProvider';

/**
 * Props for the useNotifications hook.
 *
 * @example
 * ```tsx
 * // Get unread notifications
 * const { notifications } = useNotifications({
 *   read: false
 * });
 *
 * // Get unseen notifications with specific tags
 * const { notifications } = useNotifications({
 *   seen: false,
 *   tags: ['important']
 * });
 *
 * // Get notifications (auto-updates in real time when new notifications arrive)
 * const { notifications } = useNotifications({
 *   read: false
 * });
 *
 * // Get notifications from a specific time period
 * const { notifications } = useNotifications({
 *   createdGte: 1704067200000,
 *   createdLte: 1735689599999
 * });
 * ```
 */
export type UseNotificationsProps = {
  tags?: NotificationFilter['tags'];
  data?: NotificationFilter['data'];
  read?: NotificationFilter['read'];
  archived?: NotificationFilter['archived'];
  snoozed?: NotificationFilter['snoozed'];
  seen?: NotificationFilter['seen'];
  severity?: NotificationFilter['severity'];
  createdGte?: NotificationFilter['createdGte'];
  createdLte?: NotificationFilter['createdLte'];
  limit?: number;
  onSuccess?: (data: Notification[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseNotificationsResult = {
  notifications?: Notification[];
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  readAll: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  seenAll: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  archiveAll: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  archiveAllRead: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
};

export const useNotifications = (props?: UseNotificationsProps): UseNotificationsResult => {
  const {
    tags,
    data: dataFilter,
    read,
    archived = false,
    snoozed = false,
    seen,
    severity,
    createdGte,
    createdLte,
    limit = 10,
    onSuccess,
    onError,
  } = props || {};
  const limitRef = useDataRef<number | undefined>(limit);
  const filterRef = useDataRef<NotificationFilter>({
    tags,
    data: dataFilter,
    read,
    archived,
    snoozed,
    seen,
    severity,
    createdGte,
    createdLte,
  });
  const novu = useNovu();
  const [data, setData] = useState<Array<Notification>>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const length = data?.length;
  const after = length ? data[length - 1].id : undefined;
  const afterRef = useDataRef<string | undefined>(after);

  useEffect(() => {
    const listener = ({
      data,
    }: {
      data: { notifications: Notification[]; hasMore: boolean; filter: NotificationFilter };
    }) => {
      if (!data || !isSameFilter(filterRef.current, data.filter)) {
        return;
      }

      // the event is called with the list of all notifications cached matching the current filter
      setData(data.notifications);
      setHasMore(data.hasMore);
    };

    const cleanup = novu.on('notifications.list.updated', listener);

    return () => {
      cleanup();
    };
  }, [filterRef, novu]);

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: ({ result: notification }) => {
      const currentFilter = filterRef.current;
      const matches = checkNotificationMatchesFilter(notification, currentFilter);
      if (matches) {
        // the limit and after props are used to create a cache key
        // the first batch of notifications in the cache doesn't include the after prop and we want to push to the first batch
        const cacheKey = { ...currentFilter, limit: limitRef.current };
        novu.notifications.cache.unshift(cacheKey, notification);
      }
    },
  });

  const fetchNotifications = useCallback(
    async (options?: { refetch: boolean }) => {
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
        setIsFetching(false);
      }
      setIsFetching(true);

      const response = await novu.notifications.list({
        ...filterRef.current,
        limit,
        after: options?.refetch ? undefined : afterRef.current,
      });

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
        setIsLoading(false);
        setIsFetching(false);
      } else if (response.data) {
        const responseData = response.data;
        onSuccess?.(responseData.notifications);
        setData(responseData.notifications);
        setHasMore(responseData.hasMore);
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [novu, filterRef, afterRef, limit, onError, onSuccess]
  );

  useEffect(() => {
    novu.notifications.clearCache({ filter: filterRef.current });
    fetchNotifications({ refetch: true });
  }, [filterRef, novu, JSON.stringify(filterRef.current), fetchNotifications]);

  const refetch = useCallback(() => {
    novu.notifications.clearCache({ filter: filterRef.current });
    return fetchNotifications({ refetch: true });
  }, [filterRef, novu, fetchNotifications]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || isFetching) return;

    return fetchNotifications();
  }, [hasMore, isFetching, fetchNotifications]);

  const readAll = useCallback(async () => {
    return await novu.notifications.readAll({ tags: filterRef.current.tags, data: filterRef.current.data });
  }, [filterRef, novu]);

  const seenAll = useCallback(async () => {
    return await novu.notifications.seenAll({ tags: filterRef.current.tags, data: filterRef.current.data });
  }, [filterRef, novu]);

  const archiveAll = useCallback(async () => {
    return await novu.notifications.archiveAll({ tags: filterRef.current.tags, data: filterRef.current.data });
  }, [filterRef, novu]);

  const archiveAllRead = useCallback(async () => {
    return await novu.notifications.archiveAllRead({ tags: filterRef.current.tags, data: filterRef.current.data });
  }, [filterRef, novu]);

  return {
    readAll,
    seenAll,
    archiveAll,
    archiveAllRead,
    notifications: data,
    error,
    isLoading,
    isFetching,
    refetch,
    fetchMore,
    hasMore,
  };
};
