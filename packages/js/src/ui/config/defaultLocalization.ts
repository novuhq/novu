import { createSignal } from 'solid-js';

export const commonLocalization = {
  locale: 'en-US',
} as const;

export const defaultInboxLocalization = {
  ...commonLocalization,
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
  'preferences.schedule.title': 'Schedule',
  'preferences.schedule.description': 'Allow notifications between:',
  'preferences.schedule.headerInfo':
    'Set your schedule. Notifications to external channels will pause outside the schedule. In-app and critical notifications are always delivered.',
  'preferences.schedule.info': 'Critical and In-app notifications still reach you outside your schedule.',
  'preferences.schedule.days': 'Days',
  'preferences.schedule.from': 'From',
  'preferences.schedule.to': 'To',
  'preferences.schedule.copyTimesTo': 'Copy times to',
  'preferences.schedule.sunday': 'Sunday',
  'preferences.schedule.monday': 'Monday',
  'preferences.schedule.tuesday': 'Tuesday',
  'preferences.schedule.wednesday': 'Wednesday',
  'preferences.schedule.thursday': 'Thursday',
  'preferences.schedule.friday': 'Friday',
  'preferences.schedule.saturday': 'Saturday',
  'preferences.schedule.dayScheduleCopy.title': 'Copy times to:',
  'preferences.schedule.dayScheduleCopy.selectAll': 'Select all',
  'preferences.schedule.dayScheduleCopy.apply': 'Apply',
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

export const defaultSubscriptionLocalization = {
  ...commonLocalization,
  'subscription.subscribe': 'Subscribe',
  'subscription.unsubscribe': 'Unsubscribe',
  'subscription.preferences.header': 'Manage subscription',
  'subscription.preferences.headerInfo':
    'Manage which updates you’d like to receive. Note: Workflow and global settings control delivery and take precedence when disabled.',
  'subscription.preferences.notSubscribed.header': 'You’re not subscribed.',
  'subscription.preferences.notSubscribed.description': 'Subscribe to receive updates on new activity.',
  'subscription.preferences.empty.header': 'You’re subscribed.',
  'subscription.preferences.empty.description': 'Nothing to manage right now.',
} as const;

export const defaultLocalization = {
  ...defaultInboxLocalization,
  ...defaultSubscriptionLocalization,
} as const;

export const [dynamicLocalization, setDynamicLocalization] = createSignal<Record<string, string>>({});
