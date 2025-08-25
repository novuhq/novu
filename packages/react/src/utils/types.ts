import type { Subscriber, UnreadCount } from '@novu/js';
import type {
  IconKey,
  InboxProps,
  Theme as JsTheme,
  Localization,
  Notification,
  NotificationActionClickHandler,
  NotificationClickHandler,
  PreferenceGroups,
  PreferencesFilter,
  RouterPush,
  Tab,
} from '@novu/js/ui';
import type { ReactNode } from 'react';

export type NotificationsRenderer = (notification: Notification) => React.ReactNode;
export type AvatarRenderer = (notification: Notification) => React.ReactNode;
export type SubjectRenderer = (notification: Notification) => React.ReactNode;
export type BodyRenderer = (notification: Notification) => React.ReactNode;
export type DefaultActionsRenderer = (notification: Notification) => React.ReactNode;
export type CustomActionsRenderer = (notification: Notification) => React.ReactNode;
export type BellRenderer = (unreadCount: UnreadCount) => React.ReactNode;

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
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
  renderBell?: BellRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  placement?: InboxProps['placement'];
  placementOffset?: InboxProps['placementOffset'];
};

type StandardBaseProps = {
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  appearance?: ReactAppearance;
  localization?: Localization;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  routerPush?: RouterPush;
} & (
  | {
      // TODO: Backward compatibility support - remove in future versions (see NV-5801)
      /** @deprecated Use subscriber prop instead */
      subscriberId: string;
      subscriber?: never;
      applicationIdentifier: string;
    }
  | {
      subscriber: Subscriber | string;
      subscriberId?: never;
      applicationIdentifier: string;
    }
  | {
      // Keyless mode - no subscriber or subscriberId or applicationIdentifier
      subscriber?: never;
      subscriberId?: never;
      applicationIdentifier?: never;
    }
);

export type BaseProps = StandardBaseProps;

export type NotificationRendererProps = {
  renderNotification: NotificationsRenderer;
  renderAvatar?: never;
  renderSubject?: never;
  renderBody?: never;
  renderDefaultActions?: never;
  renderCustomActions?: never;
};

export type SubjectBodyRendererProps = {
  renderNotification?: never;
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
};

export type NoRendererProps = {
  renderNotification?: undefined;
  renderAvatar?: undefined;
  renderSubject?: undefined;
  renderBody?: undefined;
  renderDefaultActions?: undefined;
  renderCustomActions?: undefined;
};

export type DefaultProps = BaseProps &
  DefaultInboxProps & {
    children?: never;
  } & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

export type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};
