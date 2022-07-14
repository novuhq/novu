import { useContext } from 'react';
import { INotificationsContext } from '../index';
import { NotificationsContext } from '../store/notifications.context';

export function useNotifications() {
  const { notifications, fetchNextPage, hasNextPage, fetching, markAsSeen, updateAction, refetch } =
    useContext<INotificationsContext>(NotificationsContext);

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
