import { useNovu } from '../../context';
import type { NotificationFilter } from '../../../types';

export const useArchiveAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novu = useNovu();

  const archiveAll = async ({ tags }: { tags?: NotificationFilter['tags'] } = {}) => {
    try {
      await novu.notifications.archiveAll({ tags });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { archiveAll };
};
