import type { NotificationFilter } from '../../../types';
import { useNovu } from '../../context';

export const useArchiveAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novuAccessor = useNovu();

  const archiveAll = async ({
    tags,
    data,
  }: {
    tags?: NotificationFilter['tags'];
    data?: Record<string, unknown>;
  } = {}) => {
    try {
      await novuAccessor().notifications.archiveAll({ tags, data });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { archiveAll };
};
