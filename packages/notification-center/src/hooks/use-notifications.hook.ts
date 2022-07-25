import { useContext } from 'react';
import { INotificationsContext } from '../index';
import { NotificationsContext } from '../store/notifications.context';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

interface IUseNotificationsProps {
  storeId?: string;
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

  const storeId = props?.storeId ? props?.storeId : 'default_store';

  const notifications = mapNotifications[storeId];

  async function fetchNextPage() {
    await mapFetchNextPage(storeId);
  }

  const hasNextPage = mapHasNextPage?.has(storeId) ? mapHasNextPage.get(storeId) : true;

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await mapUpdateAction(messageId, actionButtonType, status, payload, storeId);
  }

  async function refetch() {
    await mapRefetch(storeId);
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
