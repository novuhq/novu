import type { Notification } from '../notifications/notification';
import { Novu } from '../novu';
import { Schedule } from '../preferences';
import type { Preference } from '../preferences/preference';
import { SubscriptionPreference, TopicSubscription } from '../subscriptions';
import { type NotificationFilter, type NovuOptions, type UnreadCount, WorkflowCriticalityEnum } from '../types';
import { commonAppearanceKeys, inboxAppearanceKeys, subscriptionAppearanceKeys } from './config';
import { AllLocalization } from './context/LocalizationContext';

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

export type CommonIconKey = 'cogs' | 'check' | 'arrowDown' | 'nodeTree';
export type CommonAppearanceKey = (typeof commonAppearanceKeys)[number];
export type IconRenderer = (el: HTMLDivElement, props: { class?: string }) => () => void;

// INBOX APPEARANCE
export type InboxAppearanceCallback = {
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

  // Schedule
  scheduleContainer: (context: { schedule?: Schedule }) => string;
  scheduleHeader: (context: { schedule?: Schedule }) => string;
  scheduleLabelContainer: (context: { schedule?: Schedule }) => string;
  scheduleLabelScheduleIcon: (context: { schedule?: Schedule }) => string;
  scheduleLabelInfoIcon: (context: { schedule?: Schedule }) => string;
  scheduleLabel: (context: { schedule?: Schedule }) => string;
  scheduleActionsContainer: (context: { schedule?: Schedule }) => string;
  scheduleActionsContainerRight: (context: { schedule?: Schedule }) => string;
  scheduleBody: (context: { schedule?: Schedule }) => string;
  scheduleDescription: (context: { schedule?: Schedule }) => string;
  scheduleTable: (context: { schedule?: Schedule }) => string;
  scheduleTableHeader: (context: { schedule?: Schedule }) => string;
  scheduleHeaderColumn: (context: { schedule?: Schedule }) => string;
  scheduleTableBody: (context: { schedule?: Schedule }) => string;
  scheduleBodyRow: (context: { schedule?: Schedule }) => string;
  scheduleBodyColumn: (context: { schedule?: Schedule }) => string;
  scheduleInfoContainer: (context: { schedule?: Schedule }) => string;
  scheduleInfoIcon: (context: { schedule?: Schedule }) => string;
  scheduleInfo: (context: { schedule?: Schedule }) => string;

  // Day Schedule Copy
  dayScheduleCopyTitle: (context: { schedule?: Schedule }) => string;
  dayScheduleCopyIcon: (context: { schedule?: Schedule }) => string;
  dayScheduleCopySelectAll: (context: { schedule?: Schedule }) => string;
  dayScheduleCopyDay: (context: { schedule?: Schedule }) => string;
  dayScheduleCopyFooterContainer: (context: { schedule?: Schedule }) => string;

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
export type InboxAppearanceCallbackKeys = keyof InboxAppearanceCallback;
export type InboxAppearanceCallbackFunction<K extends InboxAppearanceCallbackKeys> = InboxAppearanceCallback[K];
export type InboxAppearanceKey = (typeof inboxAppearanceKeys)[number];
export type InboxElements = Partial<
  { [K in CommonAppearanceKey]: ElementStyles } & {
    [K in Exclude<InboxAppearanceKey, InboxAppearanceCallbackKeys> | CommonAppearanceKey]: ElementStyles;
  } & {
    [K in Extract<InboxAppearanceKey, InboxAppearanceCallbackKeys>]: ElementStyles | InboxAppearanceCallbackFunction<K>;
  }
>;
export type InboxIconKey =
  | CommonIconKey
  | 'bell'
  | 'clock'
  | 'arrowDropDown'
  | 'dots'
  | 'markAsRead'
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
  | 'routeFill'
  | 'info'
  | 'calendarSchedule'
  | 'copy';
export type InboxIconOverrides = {
  [key in InboxIconKey]?: IconRenderer;
};
export type InboxTheme = {
  variables?: Variables;
  elements?: InboxElements;
  animations?: boolean;
  icons?: InboxIconOverrides;
};
export type InboxAppearance = InboxTheme & { baseTheme?: InboxTheme | InboxTheme[] };

// SUBSCRIPTION APPEARANCE
export type SubscriptionAppearanceCallback = {
  // Subscription
  subscriptionContainer: (context: { subscription?: TopicSubscription }) => string;
  // Subscription Button
  subscriptionButton__button: (context: { subscription?: TopicSubscription }) => string;
  subscriptionButtonContainer: (context: { subscription?: TopicSubscription }) => string;
  subscriptionButtonIcon: (context: { subscription?: TopicSubscription }) => string;
  subscriptionButtonLabel: (context: { subscription?: TopicSubscription }) => string;
  // Subscription Popover
  subscription__popoverTriggerContainer: (context: { subscription?: TopicSubscription }) => string;
  subscription__popoverTrigger: (context: { subscription?: TopicSubscription }) => string;
  subscriptionTriggerIcon: (context: { subscription?: TopicSubscription }) => string;
  subscription__popoverContent: (context: { subscription?: TopicSubscription }) => string;
  // Subscription Preferences
  subscriptionPreferencesContainer: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesHeaderContainer: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesHeader: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesInfoIcon: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesContent: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesGroupsContainer: (context: { subscription?: TopicSubscription }) => string;
  // Subscription Preferences Fallback
  subscriptionPreferencesFallback: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesFallbackTexts: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesFallbackHeader: (context: { subscription?: TopicSubscription }) => string;
  subscriptionPreferencesFallbackDescription: (context: { subscription?: TopicSubscription }) => string;
  // Subscription Preference Row
  subscriptionPreferenceRow: (context: { preference: { label: string; preference: SubscriptionPreference } }) => string;
  subscriptionPreferenceLabel: (context: {
    preference: { label: string; preference: SubscriptionPreference };
  }) => string;
  // Subscription Preference Group Row
  subscriptionPreferenceGroupContainer: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupHeader: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupLabelContainer: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupLabelIcon: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupLabel: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupActionsContainer: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupActionsContainerRight__icon: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupBody: (context: {
    group: { label: string; group: Array<{ label: string; preference: SubscriptionPreference }> };
  }) => string;
  subscriptionPreferenceGroupWorkflowRow: (context: {
    preference: { label: string; preference: SubscriptionPreference };
  }) => string;
  subscriptionPreferenceGroupWorkflowLabel: (context: {
    preference: { label: string; preference: SubscriptionPreference };
  }) => string;
};
export type SubscriptionAppearanceCallbackKeys = keyof SubscriptionAppearanceCallback;
export type SubscriptionAppearanceCallbackFunction<K extends SubscriptionAppearanceCallbackKeys> =
  SubscriptionAppearanceCallback[K];
export type SubscriptionAppearanceKey = (typeof subscriptionAppearanceKeys)[number];
export type SubscriptionElements = Partial<
  { [K in CommonAppearanceKey]: ElementStyles } & {
    [K in Exclude<SubscriptionAppearanceKey, SubscriptionAppearanceCallbackKeys>]: ElementStyles;
  } & {
    [K in Extract<SubscriptionAppearanceKey, SubscriptionAppearanceCallbackKeys>]:
      | ElementStyles
      | SubscriptionAppearanceCallbackFunction<K>;
  }
>;
export type SubscriptionIconKey = CommonIconKey | 'bellCross' | 'bellPlus' | 'loader';
export type SubscriptionIconOverrides = {
  [key in SubscriptionIconKey]?: IconRenderer;
};
export type SubscriptionTheme = {
  variables?: Variables;
  elements?: SubscriptionElements;
  animations?: boolean;
  icons?: SubscriptionIconOverrides;
};
export type SubscriptionAppearance = SubscriptionTheme & { baseTheme?: SubscriptionTheme | SubscriptionTheme[] };

// ALL APPEARANCE
export type AllAppearanceCallbackKeys = InboxAppearanceCallbackKeys | SubscriptionAppearanceCallbackKeys;
export type AllAppearanceCallbackFunction<K extends AllAppearanceCallbackKeys> = K extends InboxAppearanceCallbackKeys
  ? InboxAppearanceCallbackFunction<K>
  : K extends SubscriptionAppearanceCallbackKeys
    ? SubscriptionAppearanceCallbackFunction<K>
    : never;
export type AllAppearanceKey = CommonAppearanceKey | InboxAppearanceKey | SubscriptionAppearanceKey;
export type AllElements = Partial<
  {
    [K in CommonAppearanceKey]: ElementStyles;
  } & {
    // regular appearance keys with static styles
    [K in Exclude<AllAppearanceKey, AllAppearanceCallbackKeys>]: ElementStyles;
  } & {
    // callback keys that can be either static styles or callback functions
    [K in Extract<AllAppearanceKey, AllAppearanceCallbackKeys>]: ElementStyles | AllAppearanceCallbackFunction<K>;
  }
>;
export type AllIconKey = CommonIconKey | InboxIconKey | SubscriptionIconKey;
export type AllIconOverrides = {
  [key in AllIconKey]?: IconRenderer;
};
export type AllTheme = {
  variables?: Variables;
  elements?: AllElements;
  animations?: boolean;
  icons?: AllIconOverrides;
};
export type AllAppearance = AllTheme & { baseTheme?: AllTheme | AllTheme[] };

export type BaseNovuProviderProps = {
  container?: Node | string | null;
  appearance?: AllAppearance;
  localization?: AllLocalization;
  options: NovuOptions;
  tabs?: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  preferencesSort?: PreferencesSort;
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

/** Preferences list API accepts a flat OR tag list only (not CNF). */
export type PreferencesFilter = {
  tags?: string[];
  severity?: NotificationFilter['severity'];
  criticality?: WorkflowCriticalityEnum;
};

export type PreferencesSort = (a: Preference, b: Preference) => number;

type PreferenceFilterFunction = (args: { preferences: Preference[] }) => Preference[];

type PreferenceGroupFilter = (PreferencesFilter & { workflowIds?: string[] }) | PreferenceFilterFunction;

export type PreferenceGroups = Array<{
  name: string;
  filter: PreferenceGroupFilter;
}>;

export {
  AllLocalization,
  AllLocalizationKey,
  InboxLocalization,
  InboxLocalizationKey,
  SubscriptionLocalization,
  SubscriptionLocalizationKey,
} from './context/LocalizationContext';
