import { createEffect, onCleanup } from 'solid-js';
import { NotificationVisibilityTracker } from '../../notifications/visibility-tracker';
import { useNovu } from '../context';

export function useNotificationVisibility() {
  const novuAccessor = useNovu();
  let tracker: NotificationVisibilityTracker | null = null;

  createEffect(() => {
    // Initialize the visibility tracker with the inbox service
    tracker = new NotificationVisibilityTracker(novuAccessor().notifications._inboxService);

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
