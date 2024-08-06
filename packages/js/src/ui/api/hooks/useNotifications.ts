import { onCleanup, onMount } from 'solid-js';
import { ListNotificationsArgs, ListNotificationsResponse } from '../../../notifications';
import { isSameFilter } from '../../../utils/notification-utils';
import { useNovu } from '../../context';
import { createInfiniteScroll } from '../../helpers';

type UseNotificationsInfiniteScrollProps = {
  options?: Exclude<ListNotificationsArgs, 'offset' | 'after'>;
};
export const useNotificationsInfiniteScroll = (props?: UseNotificationsInfiniteScrollProps) => {
  const novu = useNovu();

  const [data, { initialLoading, setEl, end, mutate }] = createInfiniteScroll(async (offset) => {
    const { data } = await novu.notifications.list({ ...(props?.options || {}), offset });

    return { data: data?.notifications ?? [], hasMore: data?.hasMore ?? false };
  });

  onMount(() => {
    const listener = ({ data }: { data: ListNotificationsResponse }) => {
      const filter = { tags: props?.options?.tags, read: props?.options?.read, archived: props?.options?.archived };

      if (!data || !isSameFilter(filter, data.filter)) {
        return;
      }

      mutate({ data: data.notifications, hasMore: data.hasMore });
    };

    novu.on('notifications.list.updated', listener);

    onCleanup(() => novu.off('notifications.list.updated', listener));
  });

  return { data, initialLoading, setEl, end };
};
