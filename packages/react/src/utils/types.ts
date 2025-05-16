import type {
  Notification,
  NotificationClickHandler,
  NotificationActionClickHandler,
  Tab,
  Appearance as JsAppearance,
  Theme as JsTheme,
  IconKey,
  Localization,
  RouterPush,
  PreferencesFilter,
  PreferenceGroups,
  InboxProps,
  InboxPage,
} from '@novu/js/ui';
import type { Subscriber } from '@novu/js';
import type { ReactNode } from 'react';

export type NotificationsRenderer = (notification: Notification) => React.ReactNode;
export type SubjectRenderer = (notification: Notification) => React.ReactNode;
export type BodyRenderer = (notification: Notification) => React.ReactNode;
export type BellRenderer = (unreadCount: number) => React.ReactNode;

export type ReactIconRendererProps = { class?: string };
export type ReactIconRenderer = (props: ReactIconRendererProps) => ReactNode;

export type ReactIconOverrides = {
  [key in IconKey]?: ReactIconRenderer;
};

export type ReactTheme = Omit<JsTheme, 'icons'> & {
  icons?: ReactIconOverrides;
};

export type ReactAppearance = ReactTheme & {
  baseTheme?: JsTheme | JsTheme[];
};

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
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  appearance?: ReactAppearance;
  localization?: Localization;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  container?: Node | null;
  routerPush?: RouterPush;
} & (
  | {
      // TODO: Backward compatibility support - remove in future versions (see NV-5801)
      /** @deprecated Use subscriber prop instead */
      subscriberId: string;
      subscriber?: never;
    }
  | {
      subscriber: Subscriber | string;
      subscriberId?: never;
    }
);

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
