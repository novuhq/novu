import { createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { FetchFeedArgs, Notification } from 'src/feeds';
import { fetchFeeds as fetcher } from '../feeds';

export const useFeeds = (props: { options: FetchFeedArgs }) => {
  const [feeds, setFeeds] = createSignal<Notification[]>([]);
  const [pagination, setPagination] = createStore({ currentPage: 1, hasMore: true });

  const fetchFeeds = async ({ options }: { options: FetchFeedArgs }) => {
    if (!pagination.hasMore) return;

    const response = await fetcher(options);

    setFeeds((prev) => [...prev, ...response.data]);
    setPagination({
      currentPage: response.page,
      hasMore: response.hasMore,
    });
  };

  createEffect(() => {
    fetchFeeds({ options: props.options });
  });

  return { feeds, fetchFeeds };
};
