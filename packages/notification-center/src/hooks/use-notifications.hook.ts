import { useApi } from './use-api.hook';
import { useEffect, useState } from 'react';
import { IMessage } from '@novu/shared';

export function useNotifications(feedId: string | string[]) {
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
    const newNotifications = await api.getNotificationsList(pageToFetch, feedId);

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

  async function refetch() {
    await fetchPage(0, true);
  }

  return {
    notifications,
    fetchNextPage,
    hasNextPage,
    fetching,
    markAsSeen,
    refetch,
  };
}
