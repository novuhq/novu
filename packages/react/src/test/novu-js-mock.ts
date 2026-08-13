export const NOTIFICATION_COUNT_SYNC_EVENTS = [
  'notification.read.resolved',
  'notification.unread.resolved',
  'notification.seen.resolved',
  'notification.archive.resolved',
  'notification.unarchive.resolved',
  'notification.snooze.resolved',
  'notification.unsnooze.resolved',
  'notification.delete.resolved',
  'notifications.read_all.resolved',
  'notifications.seen_all.resolved',
  'notifications.archive_all.resolved',
  'notifications.archive_all_read.resolved',
  'notifications.delete_all.resolved',
] as const;

export function checkNotificationMatchesFilter(
  notification: { isRead: boolean },
  filter: { read?: boolean }
): boolean {
  return filter.read === undefined || notification.isRead === filter.read;
}

export function isSameFilter(a: { read?: boolean }, b: { read?: boolean }): boolean {
  return a.read === b.read;
}

export class NovuError extends Error {}

export class Novu {}
