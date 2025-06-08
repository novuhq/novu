import { createSignal } from 'solid-js';

export const defaultLocalization = {
  locale: 'en-US',
  'inbox.filters.dropdownOptions.unread': 'Unread only',
  'inbox.filters.dropdownOptions.default': 'Unread & read',
  'inbox.filters.dropdownOptions.archived': 'Archived',
  'inbox.filters.dropdownOptions.snoozed': 'Snoozed',
  'inbox.filters.labels.unread': 'Unread',
  'inbox.filters.labels.default': 'Inbox',
  'inbox.filters.labels.archived': 'Archived',
  'inbox.filters.labels.snoozed': 'Snoozed',
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
  'notification.actions.snooze.tooltip': 'Snooze',
  'notification.actions.unsnooze.tooltip': 'Unsnooze',
  'notification.snoozedUntil': 'Snoozed until',
  'preferences.title': 'Preferences',
  'preferences.emptyNotice': 'No notification specific preferences yet.',
  'preferences.global': 'Global Preferences',
  'preferences.workflow.disabled.notice':
    'Contact admin to enable subscription management for this critical notification.',
  'preferences.workflow.disabled.tooltip': 'Contact admin to edit',
  'preferences.group.info': 'Applies to all notifications under this group.',
  'snooze.datePicker.timePickerLabel': 'Time',
  'snooze.datePicker.apply': 'Apply',
  'snooze.datePicker.cancel': 'Cancel',
  'snooze.options.anHourFromNow': 'An hour from now',
  'snooze.datePicker.pastDateTooltip': 'Selected time must be at least 3 minutes in the future',
  'snooze.datePicker.noDateSelectedTooltip': 'Please select a date',
  'snooze.datePicker.exceedingLimitTooltip': ({ days }: { days: number }) =>
    `Selected time cannot exceed ${days === 1 ? '24 hours' : `${days} days`} from now`,
  'snooze.options.customTime': 'Custom time...',
  'snooze.options.inOneDay': 'Tomorrow',
  'snooze.options.inOneWeek': 'Next week',
} as const;

export const [dynamicLocalization, setDynamicLocalization] = createSignal<Record<string, string>>({});
