import { useContext, useEffect } from 'react';
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
    disposeDefault,
  } = useContext<INotificationsContext>(NotificationsContext);

  const notifications = mapNotifications[props?.storeId];

  useEffect(() => {
    if (props?.storeId) disposeDefault();
  }, []);

  async function fetchNextPage() {
    await mapFetchNextPage(props?.storeId);
  }

  const hasNextPage = mapHasNextPage?.has(props?.storeId) ? mapHasNextPage.get(props?.storeId) : true;

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await mapUpdateAction(messageId, actionButtonType, status, payload, props?.storeId);
  }

  async function refetch() {
    await mapRefetch(props?.storeId);
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
