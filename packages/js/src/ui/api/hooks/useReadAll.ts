import type { NotificationFilter } from '../../../types';
import { useNovu } from '../../context';

export const useReadAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novuAccessor = useNovu();

  const readAll = async ({
    tags,
    data,
  }: {
    tags?: NotificationFilter['tags'];
    data?: Record<string, unknown>;
  } = {}) => {
    try {
      await novuAccessor().notifications.readAll({ tags, data });
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { readAll };
};
