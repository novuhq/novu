import { useNovu } from '../../context';
import { MarkAllNotificationsAsArgs } from '../../../feeds';
import { NotificationStatus } from '../../../types';

/**
 * TODO: Update the snippet to after Filter is implemented to change the status and also add hooks for archive and other statuses
 */
export const useReadAll = (props?: { onSuccess?: (data: number) => void; onError?: (err: unknown) => void }) => {
  const novu = useNovu();

  const markAllAsRead = async (feedIdentifier?: MarkAllNotificationsAsArgs['feedIdentifier']) => {
    try {
      const response = await novu.feeds.markAllNotificationsAs({
        feedIdentifier,
        status: NotificationStatus.READ,
      });
      props?.onSuccess?.(response);
    } catch (error) {
      props?.onError?.(error);
    }
  };

  return { markAllAsRead };
};
