import { createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNovu } from '../../context';
import { FetchFeedArgs, Notification } from '../../../feeds';
import { PaginatedResponse } from '../../../types';

export const useFeed = (props: {
  options: FetchFeedArgs;
  onSuccess?: (data: PaginatedResponse<Notification>) => void;
  onError?: (err: unknown) => void;
}) => {
  const [feed, setFeed] = createSignal<Notification[]>([]);
  const [pagination, setPagination] = createStore({ currentPage: 1, hasMore: true });

  const novu = useNovu();

  const fetchFeed = async ({ options }: { options: FetchFeedArgs }) => {
    if (!pagination.hasMore) return;

    try {
      const response = await novu.feeds.fetch(options);

      setFeed((prev) => [...prev, ...response.data]);
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
    fetchFeed({ options: props.options });
  });

  return { feed, fetchFeed, hasMore: pagination.hasMore, page: pagination.currentPage };
};
