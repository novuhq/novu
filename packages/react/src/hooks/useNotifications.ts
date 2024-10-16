import { useState, useEffect, useRef } from 'react';
import { ListNotificationsResponse, Notification, NovuError, isSameFilter, NotificationFilter } from '@novu/js';
import { useNovu } from './NovuProvider';

export type UseNotificationsProps = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
  limit?: number;
  onSuccess?: (data: Notification[]) => void;
  onError?: (error: NovuError) => void;
};

export const useNotifications = (props?: UseNotificationsProps) => {
  const { tags, read, archived = false, limit, onSuccess, onError } = props || {};
  const filterRef = useRef<NotificationFilter | undefined>(undefined);
  const { notifications, on } = useNovu();
  const [data, setData] = useState<Array<Notification>>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const length = data?.length;
  const after = length ? data[length - 1].id : undefined;

  const sync = (event: { data?: ListNotificationsResponse }) => {
    if (!event.data || (filterRef.current && !isSameFilter(filterRef.current, event.data.filter))) {
      return;
    }
    setData(event.data.notifications);
    setHasMore(event.data.hasMore);
  };

  useEffect(() => {
    const cleanup = on('notifications.list.updated', sync);

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const newFilter = { tags, read, archived };
    if (filterRef.current && isSameFilter(filterRef.current, newFilter)) {
      return;
    }

    notifications.clearCache({ filter: filterRef.current });
    filterRef.current = newFilter;

    fetchNotifications({ refetch: true });
  }, [tags, read, archived]);

  const fetchNotifications = async (options?: { refetch: boolean }) => {
    if (options?.refetch) {
      setError(undefined);
      setIsLoading(true);
      setIsFetching(false);
    }
    setIsFetching(true);
    const response = await notifications.list({
      tags,
      read,
      archived,
      limit,
      after: options?.refetch ? undefined : after,
    });
    if (response.error) {
      setError(response.error);
      onError?.(response.error);
    } else {
      onSuccess?.(response.data!.notifications);
      setData(response.data!.notifications);
      setHasMore(response.data!.hasMore);
    }
    setIsLoading(false);
    setIsFetching(false);
  };

  const refetch = () => {
    notifications.clearCache({ filter: { tags, read, archived } });

    return fetchNotifications({ refetch: true });
  };

  const fetchMore = async () => {
    if (!hasMore || isFetching) return;

    return fetchNotifications();
  };

  const readAll = async () => {
    return await notifications.readAll({ tags });
  };

  const archiveAll = async () => {
    return await notifications.archiveAll({ tags });
  };

  const archiveAllRead = async () => {
    return await notifications.archiveAllRead({ tags });
  };

  return {
    readAll,
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
