import type {
  Notification,
  NotificationClickHandler,
  NotificationActionClickHandler,
  Tab,
  Appearance,
  Localization,
  RouterPush,
  PreferencesFilter,
  InboxProps,
} from '@novu/js/ui';

export type NotificationsRenderer = (notification: Notification) => React.ReactNode;
export type SubjectRenderer = (notification: Notification) => React.ReactNode;
export type BodyRenderer = (notification: Notification) => React.ReactNode;
export type BellRenderer = (unreadCount: number) => React.ReactNode;

export type DefaultInboxProps = {
  open?: boolean;
  renderNotification?: NotificationsRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderBell?: BellRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  placement?: InboxProps['placement'];
  placementOffset?: InboxProps['placementOffset'];
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
  preferencesFilter?: PreferencesFilter;
  routerPush?: RouterPush;
};

export type NotificationRendererProps = {
  renderNotification: NotificationsRenderer;
  renderSubject?: never;
  renderBody?: never;
};

export type SubjectBodyRendererProps = {
  renderNotification?: never;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
};

export type NoRendererProps = {
  renderNotification?: undefined;
  renderSubject?: undefined;
  renderBody?: undefined;
};

export type DefaultProps = BaseProps &
  DefaultInboxProps & {
    children?: never;
  } & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

export type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};

export type { Notification };
