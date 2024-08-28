import { createSignal } from 'solid-js';

export const defaultLocalization = {
  locale: 'en-US',
  'inbox.status.options.unread': 'Unread only',
  'inbox.status.options.unreadRead': 'Unread & read',
  'inbox.status.options.archived': 'Archived',
  'inbox.status.unread': 'Unread',
  'inbox.status.unreadRead': 'Inbox',
  'inbox.status.archived': 'Archived',
  'notifications.emptyNotice': 'No notifications',
  'notifications.actions.readAll': 'Mark all as read',
  'notifications.actions.archiveAll': 'Archive all',
  'notifications.actions.archiveRead': 'Archive read',
  'notifications.newNotifications': ({ notificationCount }: { notificationCount: number }) =>
    `${notificationCount > 99 ? '99+' : notificationCount} new ${
      notificationCount === 1 ? 'notification' : 'notifications'
    }`,
  'notification.actions.read.tooltip': 'Mark as read',
  'notification.actions.unread.tooltip': 'Mark as unread',
  'notification.actions.archive.tooltip': 'Archive',
  'notification.actions.unarchive.tooltip': 'Unarchive',
  'preferences.title': 'Notification Preferences',
  'preferences.global': 'Global Preferences',
  'preferences.workflow.disabled.notice':
    'Contact admin to enable subscription management for this critical notification.',
  'preferences.workflow.disabled.tooltip': 'Contact admin to edit',
} as const;

export const [dynamicLocalization, setDynamicLocalization] = createSignal<Record<string, string>>({});
