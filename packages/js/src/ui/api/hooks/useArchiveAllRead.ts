import type { NotificationFilter } from '../../../types';
import { useNovu } from '../../context';

export const useArchiveAllRead = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novu = useNovu();

  const archiveAllRead = async ({
    tags,
    data,
  }: {
    tags?: NotificationFilter['tags'];
    data?: NotificationFilter['data'];
  } = {}) => {
    try {
      await novu.notifications.archiveAllRead({ tags, data });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { archiveAllRead };
};
