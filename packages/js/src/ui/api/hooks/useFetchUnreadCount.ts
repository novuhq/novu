import { createResource } from 'solid-js';
import type { FetchCountArgs } from '../../../feeds';
import { useNovu } from '../../context';

type UseUnreadCountOptions = {
  filters?: Pick<FetchCountArgs, 'archived' | 'tags'>;
  onSuccess?: (count: number) => void;
  onError?: (error: unknown) => void;
};

export const useFetchUnreadCount = ({ filters, onSuccess, onError }: UseUnreadCountOptions = { filters: {} }) => {
  const novu = useNovu();

  const [unreadCount, { refetch }] = createResource({ ...filters, read: false }, async (payload?: FetchCountArgs) => {
    try {
      const response = await novu.feeds.fetchCount(payload);
      const count = response.data.count;
      onSuccess?.(count);

      return count;
    } catch (error) {
      console.warn('Error fetching unread count:', error);
      onError?.(error);
    }
  });

  return { unreadCount, refetch };
};
