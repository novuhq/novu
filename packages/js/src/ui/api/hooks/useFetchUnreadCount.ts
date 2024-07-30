import { createResource } from 'solid-js';
import { useNovu } from '../../context';

type UseUnreadCountFilter = { tags?: string[]; archived?: boolean };
type UseUnreadCountOptions = {
  filters?: UseUnreadCountFilter;
  onSuccess?: (count: number) => void;
  onError?: (error: unknown) => void;
};

export const useFetchUnreadCount = ({ filters, onSuccess, onError }: UseUnreadCountOptions = { filters: {} }) => {
  const novu = useNovu();

  const [unreadCount, { refetch }] = createResource(
    { ...filters, read: false },
    async (payload: UseUnreadCountFilter & { read: false }) => {
      try {
        const { data } = await novu.notifications.count({ filters: [payload] });
        if (!data) {
          return;
        }

        const count = data.counts[0].count;
        onSuccess?.(count);

        return count;
      } catch (error) {
        onError?.(error);
      }
    }
  );

  return { unreadCount, refetch };
};
