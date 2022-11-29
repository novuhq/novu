import React, { useState } from 'react';
import { useApi } from '../hooks';
import { ButtonTypeEnum, IMessage, MessageActionStatusEnum } from '@novu/shared';
import { NotificationsContext } from './notifications.context';
import { useFeed } from '../hooks/use-feed.hook';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { api } = useApi();
  const { stores } = useFeed();
  const [notifications, setNotifications] = useState<Record<string, IMessage[]>>({ default_store: [] });
  const [page, setPage] = useState<Map<string, number>>(new Map<string, number>([['default_store', 0]]));
  const [hasNextPage, setHasNextPage] = useState<Record<string, boolean>>({ default_store: true });
  const [fetching, setFetching] = useState<boolean>(false);
  const [refetchTimeout, setRefetchTimeout] = useState<Map<string, NodeJS.Timeout>>(new Map());

  async function fetchPage(pageToFetch: number, isRefetch = false, storeId = 'default_store') {
    setFetching(true);

    const newNotifications = await api.getNotificationsList(pageToFetch, getStoreQuery(storeId));

    if (newNotifications?.length < 10) {
      hasNextPage[storeId] = false;
      setHasNextPage(hasNextPage);
    } else {
      hasNextPage[storeId] = true;
      setHasNextPage(hasNextPage);
    }

    if (!page.has(storeId)) {
      setPage(page.set(storeId, 0));
    }

    if (isRefetch) {
      notifications[storeId] = newNotifications;
      setNotifications(Object.assign({}, notifications));
    } else {
      notifications[storeId] = [...(notifications[storeId] || []), ...newNotifications];
      setNotifications(Object.assign({}, notifications));
    }

    setFetching(false);
  }

  async function fetchNextPage(storeId = 'default_store') {
    if (!hasNextPage[storeId]) return;

    const nextPage = page.get(storeId) + 1;
    setPage(page.set(storeId, nextPage));

    await fetchPage(nextPage, false, storeId);
  }

  async function markAsRead(messageId: string, storeId = 'default_store'): Promise<IMessage> {
    notifications[storeId] = notifications[storeId].map((message) => {
      if (message._id === messageId) {
        message.read = true;
        message.seen = true;
      }

      return message;
    });

    setNotifications(Object.assign({}, notifications));

    return await api.markMessageAs(messageId, { seen: true, read: true });
  }

  async function markAllAsRead(storeId = 'default_store'): Promise<number> {
    notifications[storeId] = notifications[storeId].map((message) => {
      message.read = true;
      message.seen = true;

      return message;
    });

    setNotifications(Object.assign({}, notifications));

    const messageIds = notifications[storeId].map((message) => {
      return message._id;
    });

    return await api.markMessageAs(messageIds, { seen: true, read: true });
  }

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    for (const storeId in notifications) {
      notifications[storeId] = notifications[storeId].map((message) => {
        if (message._id === messageId) {
          message.cta.action.status = MessageActionStatusEnum.DONE;
        }

        return message;
      });
    }

    setNotifications(Object.assign({}, notifications));
  }

  async function refetch(storeId = 'default_store') {
    setFetching(true);

    if (refetchTimeout.get(storeId)) {
      clearTimeout(refetchTimeout.get(storeId));
      setRefetchTimeout(refetchTimeout.set(storeId, null));
    }

    setRefetchTimeout(
      refetchTimeout.set(
        storeId,
        setTimeout(async () => {
          await fetchPage(0, true, storeId);
        }, 250)
      )
    );
  }

  function getStoreQuery(storeId: string) {
    return stores?.find((store) => store.storeId === storeId)?.query || {};
  }

  async function markAsSeen(
    messageId?: string,
    readExist?: boolean,
    messages?: IMessage | IMessage[],
    storeId = 'default_store'
  ) {
    if (messageId) {
      await api.markMessageAsSeen(messageId);
    }

    const notificationsToMark = getNotificationsToMark(messages, notifications, storeId);

    if (notificationsToMark.length) {
      const notificationsToUpdate = filterReadNotifications(readExist, notificationsToMark);

      const messagesIdsToMark = notificationsToUpdate.map((notification) => notification._id);
      await api.markMessageAs(messagesIdsToMark, { seen: true });
    }
  }

  function onWidgetClose() {
    resetPageState();
  }

  function onTabChange(storeId = 'default_store') {
    setPage(page.set(storeId, 0));
  }

  function resetPageState() {
    setPage(new Map<string, number>([['default_store', 0]]));
  }

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        fetchNextPage,
        hasNextPage,
        fetching,
        markAsRead,
        updateAction,
        refetch,
        markAsSeen,
        onWidgetClose,
        onTabChange,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

function getNotificationsToMark(
  messagesToMark?: IMessage | IMessage[],
  notifications?: Record<string, IMessage[]>,
  storeId?: string
) {
  if (messagesToMark) {
    return Array.isArray(messagesToMark) ? messagesToMark : [messagesToMark];
  } else {
    return notifications[storeId].filter((notification) => !notification.seen);
  }
}

function filterReadNotifications(readExist: boolean | undefined, notificationsToMark) {
  return readExist ? notificationsToMark.filter((msg) => typeof msg?.read !== 'undefined') : notificationsToMark;
}
