import { MarkAllNotificationsAsArgs } from '../../../feeds';
import { NotificationStatus } from '../../../types';
import { markAllAs } from '../feeds';

/**
 * TODO: Update the snippet to after Filter is implemented to change the status and also add hooks for archive and other statuses
 */
export const useReadAll = (props?: { onSuccess?: (data: number) => void; onError?: (err: unknown) => void }) => {
  const markAllAsRead = async (feedIdentifier?: MarkAllNotificationsAsArgs['feedIdentifier']) => {
    try {
      const response = await markAllAs({
        feedIdentifier,
        status: NotificationStatus.READ,
      });
      props?.onSuccess?.(response);
    } catch (error) {
      console.error(`Error marking all as: Read`, error);
      props?.onError?.(error);
    }
  };

  return { markAllAsRead };
};
