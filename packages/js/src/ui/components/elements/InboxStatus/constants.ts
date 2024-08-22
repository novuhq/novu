import type { LocalizationKey, NotificationStatus } from '../../../types';

export const notificationStatusOptionsLocalizationKeys = {
  unreadRead: 'inbox.filters.dropdownOptions.default',
  unread: 'inbox.filters.dropdownOptions.unread',
  archived: 'inbox.filters.dropdownOptions.archived',
} as const satisfies Record<NotificationStatus, LocalizationKey>;

export const inboxFilterLocalizationKeys = {
  unreadRead: 'inbox.filters.labels.default',
  unread: 'inbox.filters.labels.unread',
  archived: 'inbox.filters.labels.archived',
} as const satisfies Record<NotificationStatus, LocalizationKey>;
