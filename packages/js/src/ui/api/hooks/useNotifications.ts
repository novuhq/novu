import { createEffect, createSignal } from 'solid-js';
import { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../../../notifications';
import { useNovu } from '../../context';
import { createInfiniteScroll } from '../../helpers';

export const useNotifications = (props: {
  options: ListNotificationsArgs;
  onSuccess?: (data: ListNotificationsResponse) => void;
  onError?: (err: unknown) => void;
}) => {
  const [notifications, setNotifications] = createSignal<Notification[]>([]);

  const [hasMore, setHasMore] = createSignal(true);

  const novu = useNovu();

  const fetchNotifications = async ({ options }: { options: ListNotificationsArgs }) => {
    if (!hasMore()) return;

    try {
      const { data } = await novu.notifications.list(options);
      if (!data) {
        return;
      }

      setNotifications((prev) => [...prev, ...data.notifications]);
      setHasMore(data.hasMore);
      props.onSuccess?.(data);
    } catch (error) {
      props.onError?.(error);
    }
  };

  createEffect(() => {
    fetchNotifications({ options: props.options });
  });

  return { notifications, fetchNotifications, hasMore };
};

type UseNotificationsInfiniteScrollProps = {
  options?: Exclude<ListNotificationsArgs, 'offset'>;
};
export const useNotificationsInfiniteScroll = (props?: UseNotificationsInfiniteScrollProps) => {
  const novu = useNovu();

  return createInfiniteScroll(async (offset) => {
    const { data } = await novu.notifications.list({ ...(props?.options || {}), offset });

    return { data: data?.notifications ?? [], hasMore: data?.hasMore ?? false };
  });
};
