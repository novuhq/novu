import { useContext } from 'react';
import { INotificationsContext } from '../index';
import { NotificationsContext } from '../store/notifications.context';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

interface IUseNotificationsProps {
  feedId?: string;
  query?: { feedId: string | string[] };
}

export function useNotifications(props?: IUseNotificationsProps) {
  const {
    notifications: mapNotifications,
    fetchNextPage: mapFetchNextPage,
    hasNextPage: mapHasNextPage,
    fetching,
    markAsSeen,
    updateAction: mapUpdateAction,
    refetch: mapRefetch,
  } = useContext<INotificationsContext>(NotificationsContext);

  const notifications = mapNotifications.get(props?.feedId);

  async function fetchNextPage() {
    await mapFetchNextPage(props?.feedId, props?.query);
  }

  const hasNextPage = mapHasNextPage.get(props?.feedId);

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await mapUpdateAction(messageId, actionButtonType, status, payload, props?.feedId);
  }

  async function refetch() {
    await mapRefetch(props?.feedId, props?.query);
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
