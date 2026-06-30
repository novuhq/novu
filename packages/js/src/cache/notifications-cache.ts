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
import { ensureNotificationInstance } from '../notifications/helpers';
import type { InboxNotification, NotificationFilter, TagsFilter } from '../types';
import {
  areDataEqual,
  areTagsEqual,
  checkBasicFilters,
  checkNotificationTagFilter,
  isSameFilter,
} from '../utils/notification-utils';
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

// these events should update the notification in the cache
const updateEvents: NotificationEvents[] = [
  'notification.read.pending',
  'notification.read.resolved',
  'notification.unread.pending',
  'notification.unread.resolved',
  'notification.seen.pending',
  'notification.seen.resolved',
  'notification.complete_action.pending',
  'notification.complete_action.resolved',
  'notification.revert_action.pending',
  'notification.revert_action.resolved',
  'notifications.read_all.pending',
  'notifications.read_all.resolved',
  'notifications.seen_all.pending',
  'notifications.seen_all.resolved',
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

  #toNotificationInstance = (notification: Notification | InboxNotification): Notification => {
    return ensureNotificationInstance({
      notification,
      emitter: this.#emitter,
      inboxService: this.#inboxService,
    });
  };

  #normalizeNotifications = (notifications: Array<Notification | InboxNotification>): Notification[] => {
    return notifications.map((notification) => this.#toNotificationInstance(notification));
  };

  private syncNotificationInBucket = (key: string, data: Notification | InboxNotification): boolean => {
    const notification = this.#toNotificationInstance(data);
    const notificationsResponse = this.#cache.get(key);
    if (!notificationsResponse) {
      return false;
    }

    const bucketFilter = getFilter(key);
    const matchesFilter =
      checkBasicFilters(notification, bucketFilter) &&
      checkNotificationTagFilter(notification.tags, bucketFilter.tags);
    const index = notificationsResponse.notifications.findIndex((el) => el.id === notification.id);
    const existsInBucket = index !== -1;

    if (matchesFilter && existsInBucket) {
      const updatedNotifications = [...notificationsResponse.notifications];
      updatedNotifications[index] = notification;

      this.#cache.set(key, { ...notificationsResponse, notifications: updatedNotifications });

      return true;
    }

    if (!matchesFilter && existsInBucket) {
      return this.removeNotification(key, notification);
    }

    return false;
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

  private handleNotificationEvent =
    ({ remove }: { remove: boolean } = { remove: false }) =>
    (event: { data?: unknown; args?: NotificationEventArgs }): void => {
      const { data, args } = event;

      let notifications: Notification[] = [];

      if (data !== undefined && data !== null) {
        if (
          Array.isArray(data) &&
          data.every((item): item is Notification | InboxNotification => typeof item === 'object' && 'id' in item)
        ) {
          notifications = this.#normalizeNotifications(data);
        } else if (typeof data === 'object' && 'id' in data) {
          notifications = [this.#toNotificationInstance(data as Notification | InboxNotification)];
        }
      } else if (remove && args) {
        if ('notification' in args && args.notification) {
          notifications = [this.#toNotificationInstance(args.notification)];
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
            isNotificationFound = this.syncNotificationInBucket(key, notification);
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
    const cacheKeys = this.#cache.keys().filter((key) => {
      const parsedFilter = getFilter(key);

      return isSameFilter(parsedFilter, filter);
    });

    const uniqueNotifications = new Map<string, Notification>();
    let hasMore = false;

    for (const key of cacheKeys) {
      const cachedResponse = this.#cache.get(key);
      if (!cachedResponse) {
        continue;
      }

      hasMore = cachedResponse.hasMore;

      for (const notification of cachedResponse.notifications) {
        uniqueNotifications.set(notification.id, notification);
      }
    }

    return {
      hasMore,
      filter,
      notifications: Array.from(uniqueNotifications.values()),
    };
  }

  get(args: ListNotificationsArgs): ListNotificationsResponse | undefined {
    return this.#cache.get(getCacheKey(args));
  }

  has(args: ListNotificationsArgs): boolean {
    return this.#cache.get(getCacheKey(args)) !== undefined;
  }

  set(args: ListNotificationsArgs, data: ListNotificationsResponse): void {
    this.#cache.set(getCacheKey(args), {
      ...data,
      notifications: this.#normalizeNotifications(data.notifications),
    });
  }

  unshift(args: ListNotificationsArgs, notification: InboxNotification): void {
    const cacheKey = getCacheKey(args);
    const cachedData = this.#cache.get(cacheKey) || {
      hasMore: false,
      filter: getFilter(cacheKey),
      notifications: [],
    };

    const notificationInstance = this.#toNotificationInstance({ ...notification });

    const dedupedNotifications = cachedData.notifications.filter((n) => n.id !== notification.id);

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
    const keys = this.#cache.keys();
    keys.forEach((key) => {
      if (isSameFilter(getFilter(key), filter)) {
        this.#cache.remove(key);
      }
    });
  }

  clearAll(): void {
    this.#cache.clear();
  }
}
