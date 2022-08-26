import { useEffect, useState } from 'react';
import { ButtonTypeEnum, IMessage, MessageActionStatusEnum } from '@novu/shared';
import { useInfiniteQuery } from 'react-query';
import { useApi } from './use-api.hook';
import { useNovuContext } from './use-novu-context.hook';

interface IUseNotificationsProps {
  storeId?: string;
}

export function useNotifications(props?: IUseNotificationsProps) {
  const { stores } = useNovuContext();
  const { api } = useApi();
  const [notifications, setNotifications] = useState([]);

  function getStoreQuery(storeId: string) {
    return stores?.find((store) => store.storeId === storeId)?.query || {};
  }

  const { refetch, fetchNextPage, hasNextPage, isLoading, data } = useInfiniteQuery<IMessage[], unknown, IMessage[]>({
    queryKey: ['notifications', props?.storeId ? props.storeId : 'default_store'],
    queryFn: (context) =>
      api.getNotificationsList(context.pageParam ? context.pageParam : 0, getStoreQuery(props.storeId)),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) {
        return undefined;
      }

      return allPages.length;
    },
    enabled: api.isAuthenticated,
  });

  useEffect(() => {
    if (!data) {
      return;
    }
    setNotifications(data.pages.reduce((prev, current) => [...prev, ...current], []));
  }, [data]);

  async function updateAction(
    messageId: string,
    actionButtonType: ButtonTypeEnum,
    status: MessageActionStatusEnum,
    payload?: Record<string, unknown>
  ) {
    await api.updateAction(messageId, actionButtonType, status, payload);

    setNotifications(
      notifications.map((message) => {
        if (message._id === messageId) {
          message.cta.action.status = MessageActionStatusEnum.DONE;
        }

        return message;
      })
    );
  }

  async function markAsSeen(messageId: string): Promise<IMessage> {
    return await api.markMessageAsSeen(messageId);
  }

  return {
    notifications,
    fetchNextPage,
    hasNextPage,
    fetching: isLoading,
    markAsSeen,
    updateAction,
    refetch,
  };
}
