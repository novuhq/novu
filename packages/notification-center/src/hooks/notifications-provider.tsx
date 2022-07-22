import React, { useContext, useEffect, useState } from 'react';
import { useApi } from './use-api.hook';
import { IMessage, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { NotificationsContext } from '../store/notifications.context';
import { IAuthContext } from '../index';
import { AuthContext } from '../store/auth.context';
import { useNovuContext } from './use-novu-context.hook';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { api } = useApi();
  const { stores } = useNovuContext();
  const [notifications, setNotifications] = useState<Record<string, IMessage[]>>({ default_store: [] });
  const [page, setPage] = useState<Map<string, number>>(new Map([['default_store', 0]]));
  const [hasNextPage, setHasNextPage] = useState<Map<string, boolean>>(new Map([['default_store', true]]));
  const [fetching, setFetching] = useState<boolean>(false);
  const { token } = useContext<IAuthContext>(AuthContext);

  useEffect(() => {
    if (!api?.isAuthenticated || !token) return;

    fetchPage(0);
  }, [api?.isAuthenticated, token]);

  async function fetchPage(pageToFetch: number, isRefetch = false, storeId = 'default_store') {
    setFetching(true);

    const newNotifications = await api.getNotificationsList(pageToFetch, getStoreQuery(storeId));

    if (newNotifications?.length < 10) {
      setHasNextPage(hasNextPage.set(storeId, false));
    } else {
      setHasNextPage(hasNextPage.set(storeId, true));
    }

    if (!page.has(storeId)) {
      setPage(page.set(storeId, 0));
    }

    if (isRefetch) {
      notifications[storeId] = newNotifications;
      setNotifications(notifications);
    } else {
      notifications[storeId] = unique([...(notifications[storeId] || []), ...newNotifications], '_id');
      setNotifications(notifications);
    }

    setFetching(false);
  }

  function unique(array: IMessage[], key: string) {
    const set = new Set();

    return array.filter((item) => !set.has(item[key]) && set.add(item[key]));
  }

  async function fetchNextPage(storeId = 'default_store') {
    if (!hasNextPage.get(storeId)) return;

    const nextPage = page.get(storeId) + 1;
    setPage(page.set(storeId, nextPage));

    await fetchPage(nextPage, false, storeId);
  }

  async function markAsSeen(messageId: string): Promise<IMessage> {
    return await api.markMessageAsSeen(messageId);
  }

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>,
    storeId = 'default_store'
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    notifications[storeId] = notifications[storeId].map((message) => {
      if (message._id === messageId) {
        message.cta.action.status = MessageActionStatusEnum.DONE;
      }

      return message;
    });

    setNotifications(notifications);
  }

  async function refetch(storeId = 'default_store') {
    await fetchPage(0, true, storeId);
  }

  function getStoreQuery(storeId: string) {
    return stores?.find((store) => store.storeId === storeId)?.query || {};
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, fetchNextPage, hasNextPage, fetching, markAsSeen, updateAction, refetch }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
