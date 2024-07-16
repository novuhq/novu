import { createEffect, createSignal } from 'solid-js';
import { FetchFeedArgs, FetchFeedResponse, Notification } from '../../../feeds';
import { useNovu } from '../../context';
import { createInfiniteScroll } from '../../helpers';

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

type UseFeedInfiniteScrollProps = {
  options?: Exclude<FetchFeedArgs, 'offset'>;
};
export const useFeedInfiniteScroll = (props?: UseFeedInfiniteScrollProps) => {
  const novu = useNovu();

  const infiniteScroll = createInfiniteScroll(async (offset) => {
    return await novu.feeds.fetch({ ...(props?.options || {}), offset });
  });

  return infiniteScroll;
};
