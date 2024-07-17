import { createEffect, createSignal } from 'solid-js';
import { FetchFeedArgs, FetchFeedResponse, Notification } from '../../../feeds';
import { useNovu } from '../../context';

export const useFeed = (props: {
  options: FetchFeedArgs;
  onSuccess?: (data: FetchFeedResponse) => void;
  onError?: (err: unknown) => void;
}) => {
  const [feed, setFeed] = createSignal<Notification[]>([]);

  const [hasMore, setHasMore] = createSignal(true);

  const novu = useNovu();

  const fetchFeed = async ({ options }: { options: FetchFeedArgs }) => {
    if (!hasMore()) return;

    try {
      const response = await novu.feeds.fetch(options);

      setFeed((prev) => [...prev, ...response.data]);
      setHasMore(response.hasMore);
      props.onSuccess?.(response);
    } catch (error) {
      props.onError?.(error);
    }
  };

  createEffect(() => {
    fetchFeed({ options: props.options });
  });

  return { feed, fetchFeed, hasMore: hasMore };
};
