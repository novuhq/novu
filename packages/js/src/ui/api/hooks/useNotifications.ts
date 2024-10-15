import { Accessor, createEffect, onCleanup, onMount } from 'solid-js';
import { ListNotificationsArgs, ListNotificationsResponse } from '../../../notifications';
import type { NotificationFilter } from '../../../types';
import { isSameFilter } from '../../../utils/notification-utils';
import { useNovu } from '../../context';
import { createInfiniteScroll } from '../../helpers';

type UseNotificationsInfiniteScrollProps = {
  options: Accessor<Exclude<ListNotificationsArgs, 'offset'>>;
};

export const useNotificationsInfiniteScroll = (props: UseNotificationsInfiniteScrollProps) => {
  const novu = useNovu();
  let filter = { ...props.options() };

  const [data, { initialLoading, setEl, end, mutate, reset }] = createInfiniteScroll(async (offset) => {
    const { data } = await novu.notifications.list({ ...(props.options() || {}), offset });

    return { data: data?.notifications ?? [], hasMore: data?.hasMore ?? false };
  });

  onMount(() => {
    const listener = ({ data }: { data: ListNotificationsResponse }) => {
      if (!data || !isSameFilter(filter, data.filter)) {
        return;
      }

      mutate({ data: data.notifications, hasMore: data.hasMore });
    };

    const cleanup = novu.on('notifications.list.updated', listener);

    onCleanup(() => cleanup());
  });

  createEffect(() => {
    const newFilter = { ...props.options() };
    if (isSameFilter(filter, newFilter)) {
      return;
    }

    novu.notifications.clearCache();
    reset();
    filter = newFilter;
  });

  const refetch = ({ filter }: { filter?: NotificationFilter }) => {
    novu.notifications.clearCache({ filter });
    reset();
  };

  return { data, initialLoading, setEl, end, refetch };
};
