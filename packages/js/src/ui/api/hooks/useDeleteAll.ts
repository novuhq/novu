import type { NotificationFilter } from '../../../types';
import { useNovu } from '../../context';

export const useDeleteAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novuAccessor = useNovu();

  const deleteAll = async ({
    tags,
    data,
  }: {
    tags?: NotificationFilter['tags'];
    data?: Record<string, unknown>;
  } = {}) => {
    try {
      await novuAccessor().notifications.deleteAll({ tags, data });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { deleteAll };
};
