import React, { useContext, useEffect, useState } from 'react';
import { useApi } from './use-api.hook';
import { IMessage, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { NotificationsContext } from '../store/notifications.context';
import { IAuthContext } from '../index';
import { AuthContext } from '../store/auth.context';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { api } = useApi();
  const [notifications, setNotifications] = useState<Map<string, IMessage[]>>(new Map());
  const [page, setPage] = useState<Map<string, number>>(new Map([['', 0]]));
  const [hasNextPage, setHasNextPage] = useState<Map<string, boolean>>(new Map([['', true]]));
  const [fetching, setFetching] = useState<boolean>(false);
  const { token } = useContext<IAuthContext>(AuthContext);

  useEffect(() => {
    if (!api?.isAuthenticated || !token) return;

    fetchPage(0);
  }, [api?.isAuthenticated, token]);

  async function fetchPage(
    pageToFetch: number,
    isRefetch = false,
    feedId?: string,
    query?: { feedId: string | string[] }
  ) {
    setFetching(true);

    const newNotifications = await api.getNotificationsList(pageToFetch, query?.feedId);

    if (newNotifications?.length < 10) {
      setHasNextPage(hasNextPage.set(feedId, false));
    }

    if (isRefetch) {
      setNotifications(notifications.set(feedId, [...newNotifications]));
    } else {
      setNotifications(notifications.set(feedId, [...notifications.get(feedId), ...newNotifications]));
    }

    setFetching(false);
  }

  async function fetchNextPage(feedId?: string, query?: { feedId: string | string[] }) {
    if (!hasNextPage.get(feedId)) return;
    const nextPage = page.get(feedId) + 1;
    setPage(page.set(feedId, nextPage));
    await fetchPage(nextPage, false, feedId, query);
  }

  async function markAsSeen(messageId: string): Promise<IMessage> {
    return await api.markMessageAsSeen(messageId);
  }

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>,
    feedId?: string
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    notifications.set(
      feedId,
      notifications.get(feedId).map((message) => {
        if (message._id === messageId) {
          message.cta.action.status = MessageActionStatusEnum.DONE;
        }

        return message;
      })
    );

    setNotifications(notifications);
  }

  async function refetch(feedId?: string, query?: { feedId: string | string[] }) {
    await fetchPage(0, true, feedId, query);
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, fetchNextPage, hasNextPage, fetching, markAsSeen, updateAction, refetch }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
