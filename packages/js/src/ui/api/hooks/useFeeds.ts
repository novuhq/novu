import { createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNovu } from '../../context';
import { FetchFeedArgs, Notification } from '../../../feeds';
import { PaginatedResponse } from '../../../types';

export const useFeeds = (props: {
  options: FetchFeedArgs;
  onSuccess?: (data: PaginatedResponse<Notification>) => void;
  onError?: (err: unknown) => void;
}) => {
  const [feeds, setFeeds] = createSignal<Notification[]>([]);
  const [pagination, setPagination] = createStore({ currentPage: 1, hasMore: true });

  const novu = useNovu();

  const fetchFeeds = async ({ options }: { options: FetchFeedArgs }) => {
    if (!pagination.hasMore) return;

    try {
      const response = await novu.feeds.fetch(options);

      setFeeds((prev) => [...prev, ...response.data]);
      setPagination({
        currentPage: response.page,
        hasMore: response.hasMore,
      });
      props.onSuccess?.(response);
    } catch (error) {
      console.error('Error fetching feeds:', error);
      props.onError?.(error);
    }
  };

  createEffect(() => {
    fetchFeeds({ options: props.options });
  });

  return { feeds, fetchFeeds, hasMore: pagination.hasMore, page: pagination.currentPage };
};
