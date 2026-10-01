import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import type { NotificationActionClickHandler, NotificationClickHandler } from '../../types';
import type { Navigate } from '../stores/inbox';

export type NotificationItemHandlers = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const ISLAND_ATTRIBUTE = 'data-novu-island';

/**
 * Whether an event started inside an island. Islands handle their own clicks through the engine's delegated
 * listeners on the document, which run after a host's root listener, so a host-native item root must leave
 * those events alone or it would mark the notification read or navigate before the island's own handler runs.
 */
export const isInsideIsland = (target: EventTarget | null): boolean => {
  return target instanceof Element && target.closest(`[${ISLAND_ATTRIBUTE}]`) !== null;
};

export type NotificationItemController = {
  isClickable: () => boolean;
  handleClick: (event: MouseEvent) => Promise<void>;
  handleActionClick: (action: ActionTypeEnum, event: MouseEvent) => Promise<void>;
};

/**
 * The behaviour of a notification item, shared by every renderer: a click marks the notification read, calls
 * the host's handler and follows the redirect; an action completes it, calls the matching handler and follows
 * the action's redirect.
 */
export const createNotificationItemController = ({
  notification,
  handlers,
  navigate,
}: {
  notification: () => Notification;
  handlers: () => NotificationItemHandlers;
  navigate: Navigate;
}): NotificationItemController => {
  const isClickable = () => {
    const current = notification();

    return !current.isRead || !!current.redirect?.url;
  };

  const handleClick = async (event: MouseEvent) => {
    if (isInsideIsland(event.target)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const current = notification();
    if (!current.isRead) {
      await current.read();
    }

    handlers().onNotificationClick?.(current);

    navigate(current.redirect?.url, current.redirect?.target);
  };

  const handleActionClick = async (action: ActionTypeEnum, event: MouseEvent) => {
    event.stopPropagation();

    const current = notification();
    if (action === ActionTypeEnum.PRIMARY) {
      await current.completePrimary();
      handlers().onPrimaryActionClick?.(current);

      navigate(current.primaryAction?.redirect?.url, current.primaryAction?.redirect?.target);
    } else {
      await current.completeSecondary();
      handlers().onSecondaryActionClick?.(current);

      navigate(current.secondaryAction?.redirect?.url, current.secondaryAction?.redirect?.target);
    }
  };

  return { isClickable, handleClick, handleActionClick };
};
