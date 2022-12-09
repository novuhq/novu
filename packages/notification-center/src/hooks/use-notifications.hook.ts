import { useContext } from 'react';
import { NotificationsContext } from '../store/notifications.context';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { INotificationsContext } from '../shared/interfaces';
import type { IMessage } from '@novu/shared';
import type { IStoreQuery } from '@novu/client';

interface IUseNotificationsProps {
  storeId?: string;
}

export function useNotifications(props?: IUseNotificationsProps): IUseNotifications {
  const {
    notifications: mapNotifications,
    fetchNextPage: mapFetchNextPage,
    hasNextPage: mapHasNextPage,
    fetching,
    markAsRead: mapMarkAsRead,
    updateAction: mapUpdateAction,
    refetch: mapRefetch,
    markAsSeen: mapMarkAsSeen,
    onWidgetClose: mapOnWidgetClose,
    onTabChange: mapOnTabChange,
    markAllAsRead: mapMarkAllAsRead,
  } = useContext<INotificationsContext>(NotificationsContext);

  const storeId = props?.storeId ? props?.storeId : 'default_store';

  const notifications: IMessage[] = mapNotifications[storeId];

  async function fetchNextPage() {
    await mapFetchNextPage(storeId);
  }

  const hasNextPage = mapHasNextPage[storeId] ? mapHasNextPage[storeId] : false;

  async function markAsRead(messageId: string): Promise<void> {
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

  async function markAsSeen(messageId?: string, readExist?: boolean, messages?: IMessage | IMessage[]): Promise<void> {
    await mapMarkAsSeen(messageId, readExist, messages, storeId);
  }

  function onTabChange() {
    mapOnTabChange(storeId);
  }

  async function markAllAsRead(): Promise<number> {
    return await mapMarkAllAsRead(storeId);
  }

  function onWidgetClose() {
    mapOnWidgetClose();
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

export interface IUseNotifications {
  notifications: IMessage[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  fetching: boolean;
  markAsRead?: (messageId: string) => void;
  markAllAsRead: () => Promise<number>;
  updateAction: (
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) => void;
  refetch: (query?: IStoreQuery) => void;
  markAsSeen: (messageId?: string, readExist?: boolean, messages?: IMessage | IMessage[]) => void;
  onWidgetClose: () => void;
  onTabChange: () => void;
}
