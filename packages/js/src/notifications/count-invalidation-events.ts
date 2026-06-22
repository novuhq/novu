import type { NovuEventEmitter } from '../event-emitter';

export const NOTIFICATION_COUNTS_INVALIDATE_EVENT = 'notifications.counts.invalidate' as const;

/**
 * @deprecated Subscribe to {@link NOTIFICATION_COUNTS_INVALIDATE_EVENT} instead.
 * Kept for reference; count sync is driven by a single invalidation event emitted from mutation helpers.
 */
export const COUNT_MUTATION_RESOLVED_EVENTS = [
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

export function emitCountsInvalidate(emitter: NovuEventEmitter): void {
  emitter.emit(NOTIFICATION_COUNTS_INVALIDATE_EVENT, {});
}
