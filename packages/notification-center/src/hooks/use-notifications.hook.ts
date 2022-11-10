import { useContext } from 'react';
import { NotificationsContext } from '../store/notifications.context';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { INotificationsContext } from '../shared/interfaces';
import { IMessage } from '@novu/shared';

interface IUseNotificationsProps {
  storeId?: string;
}

export function useNotifications(props?: IUseNotificationsProps) {
  const {
    notifications: mapNotifications,
    fetchNextPage: mapFetchNextPage,
    hasNextPage: mapHasNextPage,
    fetching,
    markAsRead: mapMarkAsRead,
    updateAction: mapUpdateAction,
    refetch: mapRefetch,
    markAsSeen: mapMarkAsSeen,
    onWidgetClose,
    onTabChange: mapOnTabChange,
    markAllAsRead: mapMarkAllAsRead,
  } = useContext<INotificationsContext>(NotificationsContext);

  const storeId = props?.storeId ? props?.storeId : 'default_store';

  const notifications = mapNotifications[storeId];

  async function fetchNextPage() {
    await mapFetchNextPage(storeId);
  }

  const hasNextPage = mapHasNextPage[storeId] ? mapHasNextPage[storeId] : false;

  async function markAsRead(messageId: string) {
    await mapMarkAsRead(messageId, storeId);
  }

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

  async function markAsSeen(messageId?: string, readExist?: boolean, messages?: IMessage | IMessage[]) {
    await mapMarkAsSeen(messageId, readExist, messages, storeId);
  }

  async function onTabChange() {
    await mapOnTabChange(storeId);
  }

  async function markAllAsRead() {
    await mapMarkAllAsRead(storeId);
  }

  return {
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
  };
}
