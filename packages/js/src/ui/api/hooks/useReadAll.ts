import { useNovu } from '../../context';

/**
 * TODO: Update the snippet to after Filter is implemented to change the status and also add hooks for archive and other statuses
 */
export const useReadAll = (props?: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
  const novu = useNovu();

  const markAllAsRead = async () => {
    try {
      await novu.feeds.readAll();
      props?.onSuccess?.();
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { markAllAsRead };
};
