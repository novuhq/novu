import type {
  Notification,
  NotificationClickHandler,
  NotificationActionClickHandler,
  Tab,
  Appearance,
  Localization,
} from '@novu/js/ui';

export type NotificationsRenderProps = (args: { notification: Notification }) => React.ReactNode;

export type DefaultInboxProps = {
  open?: boolean;
  renderNotification?: (args: { notification: Notification }) => React.ReactNode;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => React.ReactNode;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export type BaseProps = {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  appearance?: Appearance;
  localization?: Localization;
  tabs?: Array<Tab>;
};

export type DefaultProps = BaseProps &
  DefaultInboxProps & {
    children?: never;
  };

export type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};

export type { Notification };
