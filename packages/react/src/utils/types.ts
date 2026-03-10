import type { Context, DefaultSchedule, NovuSocketOptions, Subscriber, UnreadCount } from '@novu/js';
import type {
  AllIconKey,
  AllTheme,
  InboxIconKey,
  InboxLocalization,
  InboxProps,
  InboxTheme,
  Notification,
  NotificationActionClickHandler,
  NotificationClickHandler,
  PreferenceGroups,
  PreferencesFilter,
  PreferencesSort,
  RouterPush,
  SubscriptionIconKey,
  SubscriptionTheme,
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

export type ReactInboxIconOverrides = {
  [key in InboxIconKey]?: ReactIconRenderer;
};

export type ReactInboxTheme = Omit<InboxTheme, 'icons'> & {
  icons?: ReactInboxIconOverrides;
};

export type ReactSubscriptionIconOverrides = {
  [key in SubscriptionIconKey]?: ReactIconRenderer;
};

export type ReactSubscriptionTheme = Omit<SubscriptionTheme, 'icons'> & {
  icons?: ReactSubscriptionIconOverrides;
};

export type ReactAllIconOverrides = {
  [key in AllIconKey]?: ReactIconRenderer;
};

export type ReactAllTheme = Omit<AllTheme, 'icons'> & {
  icons?: ReactAllIconOverrides;
};

export type ReactInboxAppearance = ReactInboxTheme & {
  baseTheme?: InboxTheme | InboxTheme[];
};

export type ReactSubscriptionAppearance = ReactSubscriptionTheme & {
  baseTheme?: SubscriptionTheme | SubscriptionTheme[];
};

export type ReactAllAppearance = ReactAllTheme & {
  baseTheme?: ReactAllTheme | ReactAllTheme[];
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
  contextHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  socketOptions?: NovuSocketOptions;
  appearance?: ReactInboxAppearance;
  localization?: InboxLocalization;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  preferencesSort?: PreferencesSort;
  defaultSchedule?: DefaultSchedule;
  routerPush?: RouterPush;
  context?: Context;
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

type InboxBaseProps = Omit<StandardBaseProps, 'appearance'> & {
  appearance?: ReactInboxAppearance;
};

export type BaseProps = InboxBaseProps;

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
