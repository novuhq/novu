import type { Notification } from '@novu/js';
import type { NotificationItemHandlers } from '@novu/js/ui-core';
import { createContext, type ReactNode, useContext } from 'react';

export type NotificationItemRenderers = {
  renderAvatar?: (notification: Notification) => ReactNode;
  renderSubject?: (notification: Notification) => ReactNode;
  renderBody?: (notification: Notification) => ReactNode;
  renderDefaultActions?: (notification: Notification) => ReactNode;
  renderCustomActions?: (notification: Notification) => ReactNode;
};

export type NotificationItemContextValue = {
  notification: Notification;
  handlers: NotificationItemHandlers;
  renderers: NotificationItemRenderers;
};

const NotificationItemContext = createContext<NotificationItemContextValue | undefined>(undefined);

export const NotificationItemProvider = NotificationItemContext.Provider;

export const useNotificationItem = (part: string): NotificationItemContextValue => {
  const context = useContext(NotificationItemContext);
  if (!context) {
    throw new Error(`<NotificationItem.${part} /> must be rendered inside <NotificationItem />`);
  }

  return context;
};

/**
 * The handlers given to `Inbox`, `Notifications` or `InboxContent`. Items rendered from their `renderNotification`
 * fall back to these when they get no handlers of their own.
 */
const NotificationHandlersContext = createContext<NotificationItemHandlers>({});

export const NotificationHandlersProvider = NotificationHandlersContext.Provider;

export const useInheritedNotificationHandlers = () => useContext(NotificationHandlersContext);
