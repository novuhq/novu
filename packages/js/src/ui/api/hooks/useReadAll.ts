import { useNovu } from '../../context';
import type { NotificationFilter } from '../../../types';

export const useReadAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novu = useNovu();

  const readAll = async ({ tags }: { tags?: NotificationFilter['tags'] } = {}) => {
    try {
      await novu.notifications.readAll({ tags });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { readAll };
};
