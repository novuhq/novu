import { InboxService } from '../api';
import { NotificationEvents, NovuEventEmitter } from '../event-emitter';
import type {
  ArchivedArgs,
  CompleteArgs,
  DeletedArgs,
  ListNotificationsArgs,
  ListNotificationsResponse,
  Notification,
  ReadArgs,
  RevertArgs,
  SeenArgs,
  SnoozeArgs,
  UnarchivedArgs,
  UnreadArgs,
  UnsnoozeArgs,
} from '../notifications';
import type { InboxNotification, NotificationFilter, TagsFilter } from '../types';
import { createNotification } from '../ui/internal/createNotification';
import { areDataEqual, areTagsEqual, checkNotificationMatchesFilter, isSameFilter } from '../utils/notification-utils';
import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';

const excludeEmpty = ({
  tags,
  data,
  read,
  archived,
  snoozed,
  seen,
  severity,
  limit,
  offset,
  after,
  createdGte,
  createdLte,
}: ListNotificationsArgs) =>
  Object.entries({ tags, data, read, archived, snoozed, seen, severity, limit, offset, after, createdGte, createdLte })
    .filter(([_, value]) => value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0))
    .reduce((acc, [key, value]) => {
      // @ts-expect-error
      acc[key] = value;

      return acc;
    }, {});

const getCacheKey = ({
  tags,
  data,
  read,
  archived,
  snoozed,
  seen,
  severity,
  limit,
  offset,
  after,
  createdGte,
  createdLte,
}: ListNotificationsArgs): string => {
  return JSON.stringify(
    excludeEmpty({ tags, data, read, archived, snoozed, seen, severity, limit, offset, after, createdGte, createdLte })
  );
};

const getFilterKey = ({
  tags,
  data,
  read,
  archived,
  snoozed,
  seen,
  severity,
  createdGte,
  createdLte,
}: Pick<
  ListNotificationsArgs,
  'tags' | 'data' | 'read' | 'archived' | 'snoozed' | 'seen' | 'severity' | 'createdGte' | 'createdLte'
>): string => {
  return JSON.stringify(excludeEmpty({ tags, data, read, archived, snoozed, seen, severity, createdGte, createdLte }));
};

const getFilter = (key: string): NotificationFilter => {
  return JSON.parse(key);
};

const getNotificationTimestamp = (notification: Notification): number => {
  const timestamp = new Date(notification.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortNotifications = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort((left, right) => getNotificationTimestamp(right) - getNotificationTimestamp(left));
};

// these events should update the notification in the cache
const updateEvents: NotificationEvents[] = [
  'notification.read.pending',
  'notification.read.resolved',
  'notification.unread.pending',
  'notification.unread.resolved',
  'notification.complete_action.pending',
  'notification.complete_action.resolved',
  'notification.revert_action.pending',
  'notification.revert_action.resolved',
  'notifications.read_all.pending',
  'notifications.read_all.resolved',
];

// these events should remove the notification from the cache
const removeEvents: NotificationEvents[] = [
  'notification.archive.pending',
  'notification.unarchive.pending',
  'notification.snooze.pending',
  'notification.unsnooze.pending',
  'notification.delete.pending',
  'notifications.archive_all.pending',
  'notifications.archive_all_read.pending',
  'notifications.delete_all.pending',
];

// Union type for all possible args in notification events
type NotificationEventArgs =
  | ReadArgs
  | UnreadArgs
  | ArchivedArgs
  | UnarchivedArgs
  | DeletedArgs
  | SeenArgs
  | SnoozeArgs
  | UnsnoozeArgs
  | CompleteArgs
  | RevertArgs
  | { tags?: TagsFilter; data?: Record<string, unknown> } // for bulk operations
  | { notificationIds: string[] } // for seen_all operations
  | Record<string, never>; // for empty args

export class NotificationsCache {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  /**
   * The key is the stringified notifications filter, the values are the paginated notifications.
   */
  #cache: Cache<ListNotificationsResponse>;

  constructor({ emitter, inboxService }: { emitter: NovuEventEmitter; inboxService: InboxService }) {
    this.#emitter = emitter;
    this.#inboxService = inboxService;
    updateEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent());
    });
    removeEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent({ remove: true }));
    });
    this.#cache = new InMemoryCache();
  }

  private isFirstPageCacheKey(args: ListNotificationsArgs): boolean {
    const { after, offset } = args;

    return after === undefined && (offset === undefined || offset === 0);
  }

  private updateNotification = (key: string, data: Notification): boolean => {
    const notificationsResponse = this.#cache.get(key);
    if (!notificationsResponse) {
      return false;
    }

    const parsedFilter = getFilter(key) as ListNotificationsArgs;
    const index = notificationsResponse.notifications.findIndex((el) => el.id === data.id);

    // A state transition can make an existing item stop matching the cached filter
    // (for example, an unread-only list after marking the notification as read).
    // In that case we remove it from that filtered cache instead of keeping stale data around.
    if (index !== -1 && !checkNotificationMatchesFilter(data, parsedFilter)) {
      const updatedNotifications = notificationsResponse.notifications.filter((notification) => notification.id !== data.id);

      this.#cache.set(key, { ...notificationsResponse, notifications: updatedNotifications });

      return true;
    }

    if (index === -1) {
      if (!checkNotificationMatchesFilter(data, parsedFilter) || !this.isFirstPageCacheKey(parsedFilter)) {
        return false;
      }

      // When a notification starts matching again (for example, read -> unread),
      // we restore it into the first cached page for that filter so badge/list state
      // can recover without waiting for a manual refetch.
      const notifications = sortNotifications([data, ...notificationsResponse.notifications]);
      const { limit } = parsedFilter;
      const boundedNotifications = typeof limit === 'number' ? notifications.slice(0, limit) : notifications;
      const isBounded = typeof limit === 'number' && notifications.length > limit;

      this.#cache.set(key, {
        ...notificationsResponse,
        hasMore: notificationsResponse.hasMore || isBounded,
        notifications: boundedNotifications,
      });

      return true;
    }

    const updatedNotifications = [...notificationsResponse.notifications];
    updatedNotifications[index] = data;

    this.#cache.set(key, { ...notificationsResponse, notifications: updatedNotifications });

    return true;
  };

  private removeNotification = (key: string, data: Notification): boolean => {
    const notificationsResponse = this.#cache.get(key);
    if (!notificationsResponse) {
      return false;
    }

    const index = notificationsResponse.notifications.findIndex((el) => el.id === data.id);
    if (index === -1) {
      return false;
    }

    const newNotifications = [...notificationsResponse.notifications];
    newNotifications.splice(index, 1);

    this.#cache.set(key, {
      ...notificationsResponse,
      notifications: newNotifications,
    });

    return true;
  };

  private getCacheKeysForFilter(filter: NotificationFilter): string[] {
    return this.#cache.keys().filter((key) => {
      const parsedFilter = getFilter(key);

      return isSameFilter(parsedFilter, filter);
    });
  }

  private handleNotificationEvent =
    ({ remove }: { remove: boolean } = { remove: false }) =>
    (event: { data?: unknown; args?: NotificationEventArgs }): void => {
      const { data, args } = event;

      let notifications: Notification[] = [];

      if (data !== undefined && data !== null) {
        if (
          Array.isArray(data) &&
          data.every((item): item is Notification => typeof item === 'object' && 'id' in item)
        ) {
          notifications = data;
        } else if (typeof data === 'object' && 'id' in data) {
          notifications = [data as Notification];
        }
      } else if (remove && args) {
        if ('notification' in args && args.notification) {
          notifications = [args.notification];
        } else if ('notificationId' in args && args.notificationId) {
          const foundNotifications: Notification[] = [];
          this.#cache.keys().forEach((key) => {
            const cachedResponse = this.#cache.get(key);
            if (cachedResponse) {
              const found = cachedResponse.notifications.find((n) => n.id === args.notificationId);
              if (found) {
                foundNotifications.push(found);
              }
            }
          });
          notifications = foundNotifications;
        }
      }

      if (notifications.length === 0) {
        return;
      }

      const uniqueFilterKeys = new Set<string>();
      this.#cache.keys().forEach((key) => {
        notifications.forEach((notification) => {
          let isNotificationFound = false;
          if (remove) {
            isNotificationFound = this.removeNotification(key, notification);
          } else {
            isNotificationFound = this.updateNotification(key, notification);
          }

          if (isNotificationFound) {
            uniqueFilterKeys.add(getFilterKey(getFilter(key)));
          }
        });
      });

      uniqueFilterKeys.forEach((key) => {
        const notificationsResponse = this.getAggregated(getFilter(key));

        this.#emitter.emit('notifications.list.updated', {
          data: notificationsResponse,
        });
      });
    };

  private getAggregated(filter: NotificationFilter): ListNotificationsResponse {
    const cacheKeys = this.getCacheKeysForFilter(filter);
    const notificationsById = new Map<string, Notification>();
    let hasMore = false;
    let aggregatedFilter: NotificationFilter = filter;

    for (const key of cacheKeys) {
      const cachedResponse = this.#cache.get(key);
      if (!cachedResponse) {
        continue;
      }

      // InMemoryCache keys are Map-backed, so this intentionally follows insertion order.
      // Letting the latest cached page win allows hasMore to settle back to false after
      // the terminal page is cached, instead of being stuck true forever.
      hasMore = cachedResponse.hasMore;
      aggregatedFilter = cachedResponse.filter;

      // getAll() merges every cached page for the same logical filter (different limits/offsets/afters).
      // We dedupe by notification id here so callers do not see the same notification multiple times
      // when overlapping pages or repeated realtime inserts populate more than one cache entry.
      for (const notification of cachedResponse.notifications) {
        if (!notificationsById.has(notification.id)) {
          notificationsById.set(notification.id, notification);
        }
      }
    }

    return {
      hasMore,
      filter: aggregatedFilter,
      notifications: Array.from(notificationsById.values()),
    };
  }

  get(args: ListNotificationsArgs): ListNotificationsResponse | undefined {
    return this.#cache.get(getCacheKey(args));
  }

  has(args: ListNotificationsArgs): boolean {
    return this.#cache.get(getCacheKey(args)) !== undefined;
  }

  set(args: ListNotificationsArgs, data: ListNotificationsResponse): void {
    this.#cache.set(getCacheKey(args), data);
  }

  unshift(args: ListNotificationsArgs, notification: InboxNotification): void {
    const cacheKey = getCacheKey(args);
    const cachedData = this.#cache.get(cacheKey) || {
      hasMore: false,
      filter: getFilter(cacheKey),
      notifications: [],
    };

    const notificationInstance = createNotification({
      notification: { ...notification },
      emitter: this.#emitter,
      inboxService: this.#inboxService,
    });

    // Realtime delivery can race with an already cached first page.
    // We drop older copies across every cached page for the same filter before prepending
    // into the first page, otherwise getAll() can still surface duplicates from sibling pages.
    const dedupedNotifications = cachedData.notifications.filter(
      (cachedNotification) => cachedNotification.id !== notificationInstance.id
    );
    const filter = getFilter(cacheKey);
    const cacheKeysForFilter = this.getCacheKeysForFilter(filter);

    for (const key of cacheKeysForFilter) {
      if (key === cacheKey) {
        continue;
      }

      const value = this.#cache.get(key);
      if (!value) {
        continue;
      }

      const notifications = value.notifications.filter((cachedNotification) => cachedNotification.id !== notificationInstance.id);
      if (notifications.length !== value.notifications.length) {
        this.#cache.set(key, { ...value, notifications });
      }
    }

    this.update(args, {
      ...cachedData,
      notifications: [notificationInstance, ...dedupedNotifications],
    });
  }

  update(args: ListNotificationsArgs, data: ListNotificationsResponse): void {
    this.set(args, data);
    const notificationsResponse = this.getAggregated(getFilter(getCacheKey(args)));
    this.#emitter.emit('notifications.list.updated', {
      data: notificationsResponse,
    });
  }

  getAll(args: ListNotificationsArgs): ListNotificationsResponse | undefined {
    if (this.has(args)) {
      return this.getAggregated({
        tags: args.tags,
        data: args.data,
        read: args.read,
        snoozed: args.snoozed,
        archived: args.archived,
        seen: args.seen,
        severity: args.severity,
        createdGte: args.createdGte,
        createdLte: args.createdLte,
      });
    }
  }

  /**
   * Get unique notifications based on specified filter fields.
   * The same tags and data can be applied to multiple filters which means that the same notification can be duplicated.
   */
  getUniqueNotifications({
    tags,
    read,
    data,
  }: Pick<ListNotificationsArgs, 'tags' | 'read' | 'data'>): Array<Notification> {
    const keys = this.#cache.keys();
    const uniqueNotifications = new Map<string, Notification>();

    keys.forEach((key) => {
      const filter = getFilter(key);

      if (areTagsEqual(tags, filter.tags) && areDataEqual(data, filter.data)) {
        const value = this.#cache.get(key);
        if (!value) {
          return;
        }

        value.notifications
          .filter((el) => typeof read === 'undefined' || read === el.isRead)
          .forEach((notification) => {
            uniqueNotifications.set(notification.id, notification);
          });
      }
    });

    return Array.from(uniqueNotifications.values());
  }

  clear(filter: NotificationFilter): void {
    this.getCacheKeysForFilter(filter).forEach((key) => {
      this.#cache.remove(key);
    });
  }

  clearAll(): void {
    this.#cache.clear();
  }
}
