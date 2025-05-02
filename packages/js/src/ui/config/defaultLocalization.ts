import { createSignal } from 'solid-js';

export const defaultLocalization = {
  locale: 'en-US',
  'inbox.filters.dropdownOptions.unread': 'Unread only',
  'inbox.filters.dropdownOptions.default': 'Unread & read',
  'inbox.filters.dropdownOptions.archived': 'Archived',
  'inbox.filters.dropdownOptions.snoozed': 'Pending reminders',
  'inbox.filters.labels.unread': 'Unread',
  'inbox.filters.labels.default': 'Inbox',
  'inbox.filters.labels.archived': 'Archived',
  'inbox.filters.labels.snoozed': 'Pending reminders',
  'notifications.emptyNotice': 'Quiet for now. Check back later.',
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
  'notification.actions.snooze.tooltip': 'Remind me later',
  'notification.actions.unsnooze.tooltip': 'Resolve reminder',
  'notification.remindingLater': 'Reminding later',
  'preferences.title': 'Preferences',
  'preferences.emptyNotice': 'No notification specific preferences yet.',
  'preferences.global': 'Global Preferences',
  'preferences.workflow.disabled.notice':
    'Contact admin to enable subscription management for this critical notification.',
  'preferences.workflow.disabled.tooltip': 'Contact admin to edit',
  'snooze.datePicker.timePickerLabel': 'Time',
  'snooze.datePicker.apply': 'Apply',
  'snooze.datePicker.cancel': 'Cancel',
  'snooze.options.anHourFromNow': 'An hour from now',
  'snooze.datePicker.applyTooltip': 'Date and time out of range',
  'snooze.options.customTime': 'Custom time...',
  'snooze.options.inTwelveHours': 'In 12 hours',
  'snooze.options.inOneDay': 'Tomorrow',
  'snooze.options.inOneWeek': 'Next',
} as const;

export const [dynamicLocalization, setDynamicLocalization] = createSignal<Record<string, string>>({});
