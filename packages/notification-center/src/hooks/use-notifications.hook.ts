import { useApi } from './use-api.hook';
import { useEffect, useState } from 'react';
import { IMessage, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { useNovuContext } from './use-novu-context.hook';

export function useNotifications() {
  const { api } = useApi();
  const [notifications, setNotifications] = useState<IMessage[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);

  useEffect(() => {
    if (!api?.isAuthenticated) return;

    fetchPage(0);
  }, [api?.isAuthenticated]);

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

  async function markAsSeen(messageId: string) {
    return await api.markMessageAsSeen(messageId);
  }

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    console.log({ notifications });
    setNotifications([
      ...notifications.map((message) => {
        console.log(message, messageId);
        if (message._id === messageId) {
          console.log('FOUND MESSAGE TO UPDATE');
          message.cta.action.status = MessageActionStatusEnum.DONE;
        }

        return message;
      }),
    ]);

    console.log('Updated Notifications');
  }

  async function refetch() {
    await fetchPage(0, true);
  }

  return {
    notifications,
    fetchNextPage,
    hasNextPage,
    fetching,
    markAsSeen,
    updateAction,
    refetch,
  };
}
