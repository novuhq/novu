import { onCleanup, onMount } from 'solid-js';
import { NotificationVisibilityTracker } from '../../notifications/visibility-tracker';
import { useNovu } from '../context';

export function useNotificationVisibility() {
  const novu = useNovu();
  let tracker: NotificationVisibilityTracker | null = null;

  onMount(() => {
    // Initialize the visibility tracker with the inbox service
    tracker = new NotificationVisibilityTracker(novu.notifications.inboxService);

    onCleanup(() => {
      if (tracker) {
        tracker.destroy();
        tracker = null;
      }
    });
  });

  const observeNotification = (element: Element, notificationId: string) => {
    if (tracker) {
      tracker.observe(element, notificationId);
    }
  };

  const unobserveNotification = (element: Element) => {
    if (tracker) {
      tracker.unobserve(element);
    }
  };

  return {
    observeNotification,
    unobserveNotification,
  };
}
