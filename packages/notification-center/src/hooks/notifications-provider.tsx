import React, { useEffect, useState } from 'react';
import { useApi } from './use-api.hook';
import { IMessage, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { NotificationsContext } from '../store/notifications.context';

export function NotificationsProvider({
  isSessionInitialized,
  children,
}: {
  isSessionInitialized: boolean;
  children: React.ReactNode;
}) {
  const { api } = useApi();
  const [notifications, setNotifications] = useState<IMessage[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);

  useEffect(() => {
    if (!api?.isAuthenticated || !isSessionInitialized) return;

    fetchPage(0);
  }, [api?.isAuthenticated, isSessionInitialized]);

  async function fetchPage(pageToFetch: number, isRefetch = false) {
    setFetching(true);

    const newNotifications = await api.getNotificationsList(pageToFetch);

    if (newNotifications?.length < 10) {
      setHasNextPage(false);
    }

    if (isRefetch) {
      setNotifications([...newNotifications]);
    } else {
      setNotifications([...notifications, ...newNotifications]);
    }

    setFetching(false);
  }

  async function fetchNextPage() {
    if (!hasNextPage) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPage(nextPage);
  }

  async function markAsSeen(messageId: string): Promise<IMessage> {
    return await api.markMessageAsSeen(messageId);
  }

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    setNotifications([
      ...notifications.map((message) => {
        if (message._id === messageId) {
          message.cta.action.status = MessageActionStatusEnum.DONE;
        }

        return message;
      }),
    ]);
  }

  async function refetch() {
    await fetchPage(0, true);
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, fetchNextPage, hasNextPage, fetching, markAsSeen, updateAction, refetch }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
