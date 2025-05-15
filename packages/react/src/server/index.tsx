import type {
  UseNotificationsProps,
  UseNotificationsResult,
  UsePreferencesProps,
  UsePreferencesResult,
} from '../hooks';
import type { UseCountsProps, UseCountsResult } from '../hooks/useCounts';
import type { InboxProps } from '../components/Inbox';
import type { NovuProviderProps } from '../hooks/NovuProvider';

/**
 * Exporting all components from the components folder
 * as empty functions to fix build errors in SSR
 * This will be replaced with actual components
 * when we implement the SSR components in @novu/js/ui
 */
export function Inbox(props: InboxProps) {}

export function InboxContent() {}

export function Notifications() {}

export function Preferences() {}

export function Bell() {}

export function NovuProvider(props: NovuProviderProps) {}

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

export type {
  FiltersCountResponse,
  ListNotificationsResponse,
  NovuError,
  Preference,
  ChannelPreference,
  Notification,
  ChannelType,
  InboxNotification,
  NotificationFilter,
  NotificationStatus,
  NovuOptions,
  PreferenceLevel,
} from '@novu/js';

export type {
  Appearance,
  AppearanceKey,
  Elements,
  ElementStyles,
  Localization,
  LocalizationKey,
  NotificationActionClickHandler,
  NotificationClickHandler,
  NotificationRenderer,
  PreferencesFilter,
  PreferenceGroups,
  RouterPush,
  Tab,
  Variables,
} from '@novu/js/ui';

export type { InboxProps, BellProps, InboxContentProps, NotificationProps, NovuProviderProps } from '../components';

export type {
  UseCountsProps,
  UseCountsResult,
  UseNotificationsProps,
  UseNotificationsResult,
  UsePreferencesProps,
  UsePreferencesResult,
} from '../hooks';

export type {
  NotificationsRenderer,
  SubjectRenderer,
  BodyRenderer,
  BellRenderer,
  DefaultInboxProps,
  BaseProps,
  NotificationRendererProps,
  SubjectBodyRendererProps,
  NoRendererProps,
  DefaultProps,
  WithChildrenProps,
} from '../utils/types';
