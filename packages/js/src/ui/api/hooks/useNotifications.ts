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

  const [data, { initialLoading, setEl, end, mutate, reset }] = createInfiniteScroll(
    async (after) => {
      const { data } = await novu.notifications.list({ ...(props.options() || {}), after });

      return { data: data?.notifications ?? [], hasMore: data?.hasMore ?? false };
    },
    {
      paginationField: 'id',
    }
  );

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

  createEffect(async () => {
    const newFilter = { ...props.options() };
    if (isSameFilter(filter, newFilter)) {
      return;
    }

    novu.notifications.clearCache();
    await reset();
    filter = newFilter;
  });

  const refetch = async ({ filter }: { filter?: NotificationFilter }) => {
    novu.notifications.clearCache({ filter });
    await reset();
  };

  return { data, initialLoading, setEl, end, refetch };
};
