import type { InboxProps } from '../components/Inbox';
import { ShadowRootDetector } from '../components/ShadowRootDetector';
import type {
  UseNotificationsProps,
  UseNotificationsResult,
  UsePreferencesProps,
  UsePreferencesResult,
  UseScheduleProps,
  UseScheduleResult,
} from '../hooks';
import type { NovuProviderProps } from '../hooks/NovuProvider';
import type { UseCountsProps, UseCountsResult } from '../hooks/useCounts';

/**
 * Exporting all components from the components folder
 * as empty functions to fix build errors in SSR
 * This will be replaced with actual components
 * when we implement the SSR components in @novu/js/ui
 */
export function Inbox(props: InboxProps) {
  return <ShadowRootDetector />;
}

export function InboxContent() {}

export function Notifications() {}

export function Preferences() {}

export function Bell() {}

export function NovuProvider(props: NovuProviderProps) {
  return <>{props.children}</>;
}

export function Subscription() {
  return <ShadowRootDetector />;
}

export function SubscriptionButton() {}

export function SubscriptionPreferences() {}

export function useNovu() {
  return null;
}

export function useCounts(_: UseCountsProps): UseCountsResult {
  return {
    isLoading: false,
    isFetching: false,
    refetch: () => Promise.resolve(),
  };
}

export function useNotifications(_: UseNotificationsProps): UseNotificationsResult {
  return {
    isLoading: false,
    isFetching: false,
    hasMore: false,
    readAll: () => Promise.resolve({ data: undefined, error: undefined }),
    seenAll: () => Promise.resolve({ data: undefined, error: undefined }),
    archiveAll: () => Promise.resolve({ data: undefined, error: undefined }),
    archiveAllRead: () => Promise.resolve({ data: undefined, error: undefined }),
    refetch: () => Promise.resolve(),
    fetchMore: () => Promise.resolve(),
  };
}

export function usePreferences(_: UsePreferencesProps): UsePreferencesResult {
  return {
    isLoading: false,
    isFetching: false,
    refetch: () => Promise.resolve(),
  };
}

export function useSchedule(_: UseScheduleProps): UseScheduleResult {
  return {
    isLoading: false,
    isFetching: false,
    refetch: () => Promise.resolve(),
  };
}

export type {
  ChannelPreference,
  ChannelType,
  FiltersCountResponse,
  InboxNotification,
  ListNotificationsResponse,
  Notification,
  NotificationFilter,
  NotificationStatus,
  NovuError,
  NovuOptions,
  Preference,
} from '@novu/js';
export { PreferenceLevel, SeverityLevelEnum, WorkflowCriticalityEnum } from '@novu/js';

export type {
  AllLocalization,
  AllLocalizationKey,
  ElementStyles,
  InboxAppearance,
  InboxAppearanceCallback,
  InboxAppearanceCallbackFunction,
  InboxAppearanceCallbackKeys,
  InboxAppearanceKey,
  InboxElements,
  InboxLocalization,
  InboxLocalizationKey,
  InboxTheme,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  PreferenceGroups,
  PreferencesFilter,
  RouterPush,
  SubscriptionAppearance,
  SubscriptionAppearanceCallback,
  SubscriptionAppearanceCallbackFunction,
  SubscriptionAppearanceCallbackKeys,
  SubscriptionAppearanceKey,
  SubscriptionElements,
  SubscriptionLocalization,
  SubscriptionLocalizationKey,
  SubscriptionTheme,
  Tab,
  Variables,
} from '@novu/js/ui';

export type { BellProps, InboxContentProps, InboxProps, NotificationProps, NovuProviderProps } from '../components';

export type {
  UseCountsProps,
  UseCountsResult,
  UseNotificationsProps,
  UseNotificationsResult,
  UsePreferencesResult,
  UseScheduleProps as UsePreferencesProps,
} from '../hooks';

export type {
  BaseProps,
  BellRenderer,
  BodyRenderer,
  DefaultInboxProps,
  DefaultProps,
  NoRendererProps,
  NotificationRendererProps,
  NotificationsRenderer,
  SubjectBodyRendererProps,
  SubjectRenderer,
  WithChildrenProps,
} from '../utils/types';
