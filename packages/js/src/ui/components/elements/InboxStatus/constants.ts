import { LocalizationKey } from '../../../context';
import { NotificationStatus } from '../../../types';

export const notificationStatusOptionsLocalizationKeys = {
  unreadRead: 'inbox.status.options.unreadRead',
  unread: 'inbox.status.options.unread',
  archived: 'inbox.status.options.archived',
} as const satisfies Record<NotificationStatus, LocalizationKey>;

export const inboxStatusLocalizationKeys = {
  unreadRead: 'inbox.status.unreadRead',
  unread: 'inbox.status.unread',
  archived: 'inbox.status.archived',
} as const satisfies Record<NotificationStatus, LocalizationKey>;
