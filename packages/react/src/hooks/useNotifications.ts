import { checkNotificationMatchesFilter, isSameFilter, Notification, NotificationFilter, NovuError } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    limit,
    onSuccess,
    onError,
  } = props || {};
  const filterRef = useRef<NotificationFilter | undefined>(undefined);
  const { notifications, on } = useNovu();

  const getCurrentFilter = useCallback(
    () => filterRef.current || { tags, data: dataFilter, read, archived, snoozed, seen, severity },
    [tags, dataFilter, read, archived, snoozed, seen, severity]
  );
  const [data, setData] = useState<Array<Notification>>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const length = data?.length;
  const after = length ? data[length - 1].id : undefined;

  useEffect(() => {
    const listener = ({
      data: updatedData,
    }: {
      data: { notifications: Notification[]; hasMore: boolean; filter: NotificationFilter };
    }) => {
      if (!updatedData) return;

      const currentFilter = getCurrentFilter();
      if (!isSameFilter(currentFilter, updatedData.filter)) {
        return;
      }

      setData(updatedData.notifications);
      setHasMore(updatedData.hasMore);
    };

    const cleanup = on('notifications.list.updated', listener);

    return () => {
      cleanup();
    };
  }, [getCurrentFilter, on]);

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: ({ result: notification }) => {
      const currentFilter = getCurrentFilter();
      const matches = checkNotificationMatchesFilter(notification, currentFilter);
      if (matches) {
        setData((prev) => (prev ? [notification, ...prev] : [notification]));
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

      const currentFilter = getCurrentFilter();

      const response = await notifications.list({
        ...currentFilter,
        limit,
        after: options?.refetch ? undefined : after,
      });

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
        setIsLoading(false);
        setIsFetching(false);
      } else if (response.data) {
        const responseData = response.data;
        onSuccess?.(responseData.notifications);
        if (options?.refetch) {
          setData(responseData.notifications);
        } else {
          setData((prev) => (prev ? [...prev, ...responseData.notifications] : responseData.notifications));
        }
        setHasMore(responseData.hasMore);
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [notifications, getCurrentFilter, limit, after, onError, onSuccess]
  );

  useEffect(() => {
    const newFilter = { tags, data: dataFilter, read, archived, snoozed, seen, severity };
    if (filterRef.current && isSameFilter(filterRef.current, newFilter)) {
      return;
    }
    notifications.clearCache({ filter: filterRef.current });
    filterRef.current = newFilter;

    fetchNotifications({ refetch: true });
  }, [tags, dataFilter, read, archived, snoozed, seen, severity, notifications, fetchNotifications]);

  const refetch = useCallback(() => {
    const filter = getCurrentFilter();
    notifications.clearCache({ filter });
    return fetchNotifications({ refetch: true });
  }, [getCurrentFilter, notifications, fetchNotifications]);

  const fetchMore = async () => {
    if (!hasMore || isFetching) return;

    return fetchNotifications();
  };

  const readAll = useCallback(async () => {
    const { tags, data } = getCurrentFilter();
    return await notifications.readAll({ tags, data });
  }, [getCurrentFilter, notifications]);

  const seenAll = useCallback(async () => {
    const { tags, data } = getCurrentFilter();
    return await notifications.seenAll({ tags, data });
  }, [getCurrentFilter, notifications]);

  const archiveAll = useCallback(async () => {
    const { tags, data } = getCurrentFilter();
    return await notifications.archiveAll({ tags, data });
  }, [getCurrentFilter, notifications]);

  const archiveAllRead = useCallback(async () => {
    const { tags, data } = getCurrentFilter();
    return await notifications.archiveAllRead({ tags, data });
  }, [getCurrentFilter, notifications]);

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
