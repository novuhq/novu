import React, { useState, useCallback, useMemo } from 'react';
import type { IStoreQuery } from '@novu/client';
import type { IMessage } from '@novu/shared';

import { NotificationsContext } from './notifications.context';
import type { IStore } from '../shared/interfaces';
import { useFetchNotifications, useRemoveNotification, useUnseenCount } from '../hooks';
import { useMarkNotificationsAs } from '../hooks';
import { useMarkNotificationsAsReadByFeed } from '../hooks/useMarkNotificationAsReadByFeed';

const DEFAULT_STORES = [{ storeId: 'default_store' }];

export function NotificationsProvider({
  children,
  stores = DEFAULT_STORES,
}: {
  children: React.ReactNode;
  stores?: IStore[];
}) {
  const firstStore = stores[0];
  const [storeQuery, setStoreQuery] = useState<IStoreQuery>(() => firstStore.query ?? {});
  const [storeId, setStoreId] = useState(firstStore.storeId ?? 'default_store');
  const setStore = useCallback(
    (newStoreId: string) => {
      const foundQuery = stores?.find((store) => store.storeId === newStoreId)?.query || {};
      setStoreId(newStoreId);
      setStoreQuery(foundQuery);
    },
    [stores, setStoreId, setStoreQuery]
  );
  const {
    data: notificationsPages,
    hasNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useFetchNotifications({ query: storeQuery });
  const { data: unseenCountData } = useUnseenCount();
  const { markNotificationsAs } = useMarkNotificationsAs();
  const { removeNotification } = useRemoveNotification();
  const { markNotificationsAsReadByFeed } = useMarkNotificationsAsReadByFeed();

  const markNotificationAsRead = useCallback(
    (messageId: string) => markNotificationsAs({ messageId, seen: true, read: true }),
    [markNotificationsAs]
  );

  const markNotificationAsUnRead = useCallback(
    (messageId: string) => markNotificationsAs({ messageId, seen: true, read: false }),
    [markNotificationsAs]
  );
  const removeMessage = useCallback((messageId: string) => removeNotification({ messageId }), [removeNotification]);

  const markAllNotificationsAsReadByFeed = useCallback(() => {
    markNotificationsAsReadByFeed({ feedId: storeQuery?.feedIdentifier });
  }, [markNotificationsAsReadByFeed, storeQuery?.feedIdentifier]);

  const markNotificationAsSeen = useCallback(
    (messageId: string) => markNotificationsAs({ messageId, seen: true, read: false }),
    [markNotificationsAs]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    if (!notificationsPages) {
      return;
    }

    const messageIds = notificationsPages.pages.reduce<string[]>((acc, paginatedResponse) => {
      const pageMessageIds = paginatedResponse.data.filter((message) => !message.read).map((message) => message._id);

      return [...acc, ...pageMessageIds];
    }, []);

    if (messageIds.length > 0) {
      markNotificationsAs({ messageId: messageIds, seen: true, read: true });
    }
  }, [markNotificationsAs, notificationsPages]);

  const markAllNotificationsAsSeen = useCallback(() => {
    if (!notificationsPages) {
      return;
    }

    const messageIds = notificationsPages.pages.reduce<string[]>((acc, paginatedResponse) => {
      const pageMessagesIds = paginatedResponse.data
        .filter((message) => !message.seen && !message.read)
        .map((message) => message._id);

      return [...acc, ...pageMessagesIds];
    }, []);

    if (messageIds.length > 0) {
      markNotificationsAs({ messageId: messageIds, seen: true, read: false });
    }
  }, [markNotificationsAs, notificationsPages]);

  const notifications = useMemo<IMessage[]>(
    () => notificationsPages?.pages.reduce((acc, paginatedResponse) => [...acc, ...paginatedResponse.data], []),
    [notificationsPages]
  );

  const contextValue = useMemo(
    () => ({
      storeId,
      stores,
      unseenCount: unseenCountData?.count ?? 0,
      notifications,
      hasNextPage,
      isLoading,
      isFetching,
      isFetchingNextPage,
      setStore,
      fetchNextPage,
      refetch,
      markNotificationAsSeen,
      markNotificationAsRead,
      markNotificationAsUnRead,
      markAllNotificationsAsRead,
      markAllNotificationsAsSeen,
      removeMessage,
      markAllNotificationsAsReadByFeed,
    }),
    [
      storeId,
      stores,
      unseenCountData?.count,
      notifications,
      hasNextPage,
      isLoading,
      isFetching,
      isFetchingNextPage,
      setStore,
      fetchNextPage,
      refetch,
      markNotificationAsSeen,
      markNotificationAsRead,
      markNotificationAsUnRead,
      markAllNotificationsAsRead,
      markAllNotificationsAsSeen,
      removeMessage,
      markAllNotificationsAsReadByFeed,
    ]
  );

  return <NotificationsContext.Provider value={contextValue}>{children}</NotificationsContext.Provider>;
}
