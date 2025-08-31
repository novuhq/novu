import type { Notification } from '../notifications';
import { Novu } from '../novu';
import {
  type NotificationFilter,
  type NovuOptions,
  type Preference,
  type UnreadCount,
  WorkflowCriticalityEnum,
} from '../types';
import { appearanceKeys } from './config';
import { Localization } from './context/LocalizationContext';

export type NotificationClickHandler = (notification: Notification) => void;
export type NotificationActionClickHandler = (notification: Notification) => void;

export type NotificationRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type AvatarRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type SubjectRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type BodyRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type DefaultActionsRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type CustomActionsRenderer = (el: HTMLDivElement, notification: Notification) => () => void;
export type BellRenderer = (el: HTMLDivElement, unreadCount: UnreadCount) => () => void;
export type RouterPush = (path: string) => void;

export type Tab = {
  label: string;
  /**
   * @deprecated Use `filter` instead
   */
  value?: Array<string>;
  filter?: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;
};

export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

export type Variables = {
  colorBackground?: string;
  colorForeground?: string;
  colorPrimary?: string;
  colorPrimaryForeground?: string;
  colorSecondary?: string;
  colorSecondaryForeground?: string;
  colorCounter?: string;
  colorCounterForeground?: string;
  colorNeutral?: string;
  colorShadow?: string;
  colorRing?: string;
  fontSize?: string;
  borderRadius?: string;
  colorStripes?: string;
  colorSeverityHigh?: string;
  colorSeverityMedium?: string;
  colorSeverityLow?: string;
};

export type AppearanceCallback = {
  // Bell
  bellDot: (context: { unreadCount: { total: number; severity: Record<string, number> } }) => string;
  bellIcon: (context: { unreadCount: { total: number; severity: Record<string, number> } }) => string;
  bellContainer: (context: { unreadCount: { total: number; severity: Record<string, number> } }) => string;
  severityHigh__bellContainer: (context: {
    unreadCount: { total: number; severity: Record<string, number> };
  }) => string;
  severityMedium__bellContainer: (context: {
    unreadCount: { total: number; severity: Record<string, number> };
  }) => string;
  severityLow__bellContainer: (context: { unreadCount: { total: number; severity: Record<string, number> } }) => string;
  bellSeverityGlow: (context: { unreadCount: { total: number; severity: Record<string, number> } }) => string;
  severityGlowHigh__bellSeverityGlow: (context: {
    unreadCount: { total: number; severity: Record<string, number> };
  }) => string;
  severityGlowMedium__bellSeverityGlow: (context: {
    unreadCount: { total: number; severity: Record<string, number> };
  }) => string;
  severityGlowLow__bellSeverityGlow: (context: {
    unreadCount: { total: number; severity: Record<string, number> };
  }) => string;

  // Preferences list shared between preferences and grouped preferences
  preferencesContainer: (context: {
    preferences?: Preference[];
    groups: Array<{ name: string; preferences: Preference[] }>;
  }) => string;

  // Preference
  workflowContainer: (context: { preference: Preference }) => string;
  workflowLabelContainer: (context: { preference: Preference }) => string;
  workflowLabelHeader: (context: { preference: Preference }) => string;
  workflowLabelHeaderContainer: (context: { preference: Preference }) => string;
  workflowLabelIcon: (context: { preference: Preference }) => string;
  workflowLabel: (context: { preference: Preference }) => string;
  workflowArrow__icon: (context: { preference: Preference }) => string;
  workflowContainerRight__icon: (context: { preference: Preference }) => string;

  // Channel
  channelsContainer: (context: { preference: Preference }) => string;
  channelName: (context: { preference: Preference }) => string;

  // Channel Row shared between preferences and grouped preferences
  channelContainer: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;
  channelLabelContainer: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;
  channelIconContainer: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;
  channelLabel: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;
  channelSwitchContainer: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;
  channel__icon: (context: {
    preference?: Preference;
    preferenceGroup?: { name: string; preferences: Preference[] };
  }) => string;

  // Preferences Group
  preferencesGroupContainer: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupHeader: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupLabelContainer: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupLabelIcon: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupLabel: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupActionsContainer: (context: {
    preferenceGroup: { name: string; preferences: Preference[] };
  }) => string;
  preferencesGroupActionsContainerRight__icon: (context: {
    preferenceGroup: { name: string; preferences: Preference[] };
  }) => string;
  preferencesGroupBody: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupChannels: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupInfo: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupInfoIcon: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;
  preferencesGroupWorkflows: (context: { preferenceGroup: { name: string; preferences: Preference[] } }) => string;

  // Notification list
  notificationList: (context: { notifications: Notification[] }) => string;
  notificationListContainer: (context: { notifications: Notification[] }) => string;

  // Notification
  notification: (context: { notification: Notification }) => string;
  severityHigh__notification: (context: { notification: Notification }) => string;
  severityMedium__notification: (context: { notification: Notification }) => string;
  severityLow__notification: (context: { notification: Notification }) => string;
  notificationBar: (context: { notification: Notification }) => string;
  severityHigh__notificationBar: (context: { notification: Notification }) => string;
  severityMedium__notificationBar: (context: { notification: Notification }) => string;
  severityLow__notificationBar: (context: { notification: Notification }) => string;
  notificationImageLoadingFallback: (context: { notification: Notification }) => string;
  notificationImage: (context: { notification: Notification }) => string;
  notificationContent: (context: { notification: Notification }) => string;
  notificationTextContainer: (context: { notification: Notification }) => string;
  notificationSubject: (context: { notification: Notification }) => string;
  notificationBody: (context: { notification: Notification }) => string;
  notificationDefaultActions: (context: { notification: Notification }) => string;
  notificationCustomActions: (context: { notification: Notification }) => string;
  notificationPrimaryAction__button: (context: { notification: Notification }) => string;
  notificationSecondaryAction__button: (context: { notification: Notification }) => string;
  notificationDate: (context: { notification: Notification }) => string;
  notificationDeliveredAt__badge: (context: { notification: Notification }) => string;
  notificationDeliveredAt__icon: (context: { notification: Notification }) => string;
  notificationSnoozedUntil__icon: (context: { notification: Notification }) => string;
  notificationDot: (context: { notification: Notification }) => string;
};
export type AppearanceCallbackKeys = keyof AppearanceCallback;
export type AppearanceCallbackFunction<K extends AppearanceCallbackKeys> = AppearanceCallback[K];
export type AppearanceKey = (typeof appearanceKeys)[number];
export type Elements = Partial<
  {
    // regular appearance keys with static styles
    [K in Exclude<AppearanceKey, AppearanceCallbackKeys>]: ElementStyles;
  } & {
    // callback keys that can be either static styles or callback functions
    [K in Extract<AppearanceKey, AppearanceCallbackKeys>]: ElementStyles | AppearanceCallbackFunction<K>;
  }
>;

export type IconKey =
  | 'bell'
  | 'clock'
  | 'arrowDropDown'
  | 'dots'
  | 'markAsRead'
  | 'cogs'
  | 'trash'
  | 'markAsArchived'
  | 'markAsArchivedRead'
  | 'markAsUnread'
  | 'markAsUnarchived'
  | 'unsnooze'
  | 'arrowRight'
  | 'arrowLeft'
  | 'unread'
  | 'sms'
  | 'inApp'
  | 'email'
  | 'push'
  | 'chat'
  | 'check'
  | 'arrowDown'
  | 'routeFill'
  | 'info'
  | 'nodeTree';

export type IconRenderer = (el: HTMLDivElement, props: { class?: string }) => () => void;

export type IconOverrides = {
  [key in IconKey]?: IconRenderer;
};

export type Theme = {
  variables?: Variables;
  elements?: Elements;
  animations?: boolean;
  icons?: IconOverrides;
};
export type Appearance = Theme & { baseTheme?: Theme | Theme[] };

export type BaseNovuProviderProps = {
  container?: Node | string | null;
  appearance?: Appearance;
  localization?: Localization;
  options: NovuOptions;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  routerPush?: RouterPush;
  novu?: Novu;
};

export type NovuProviderProps = BaseNovuProviderProps & {
  renderNotification?: NotificationRenderer;
  renderBell?: BellRenderer;
};

export enum NotificationStatus {
  UNREAD_READ = 'unreadRead',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
  SNOOZED = 'snoozed',
}

export type PreferencesFilter = Pick<NotificationFilter, 'tags' | 'severity'> & {
  criticality?: WorkflowCriticalityEnum;
};

type PreferenceFilterFunction = (args: { preferences: Preference[] }) => Preference[];

type PreferenceGroupFilter = (PreferencesFilter & { workflowIds?: string[] }) | PreferenceFilterFunction;

export type PreferenceGroups = Array<{
  name: string;
  filter: PreferenceGroupFilter;
}>;

export { Localization, LocalizationKey } from './context/LocalizationContext';
