// TODO check all localization keys
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
  'notification.actions.read.toolTip': 'Mark as read',
  'notification.actions.unread.toolTip': 'Mark as unread',
  'notification.actions.archive.toolTip': 'Archive',
  'notification.actions.unarchive.toolTip': 'Unarchive',
  'preferences.title': 'Notification Preferences',
  'preferences.global': 'Global Preferences',
} as const;
