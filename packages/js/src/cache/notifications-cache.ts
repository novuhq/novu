import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';
import type { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import { NotificationEvents, NotificationsEvents, NovuEventEmitter } from '../event-emitter';
import type { NotificationFilter } from '../types';
import { areTagsEqual, isSameFilter } from '../utils/notification-utils';

const getCacheKey = ({ tags, read, archived, limit, offset, after }: ListNotificationsArgs): string => {
  return JSON.stringify({ tags, read, archived, limit, offset, after });
};

const getFilterKey = ({ tags, read, archived }: Pick<ListNotificationsArgs, 'tags' | 'read' | 'archived'>): string => {
  return JSON.stringify({ tags, read, archived });
};

const getFilter = (key: string): NotificationFilter => {
  return JSON.parse(key);
};

// these events should update the notification in the cache
const notificationEvents: NotificationEvents[] = [
  'notification.read.pending',
  'notification.read.resolved',
  'notification.unread.pending',
  'notification.unread.resolved',
  'notification.complete_action.pending',
  'notification.complete_action.resolved',
  'notification.revert_action.pending',
  'notification.revert_action.resolved',
];

// these events should remove the notification from the cache
const notificationEventsThatRemove: NotificationEvents[] = [
  'notification.archive.pending',
  'notification.unarchive.pending',
];

// these events should update the notifications in the cache
const notificationsEvents: NotificationsEvents[] = [
  'notifications.read_all.pending',
  'notifications.read_all.resolved',
];

// these events should remove the notifications from the cache
const notificationsEventsThatRemove: NotificationsEvents[] = [
  'notifications.archive_all.pending',
  'notifications.archive_all_read.pending',
];

export class NotificationsCache {
  #emitter: NovuEventEmitter;
  /**
   * The key is the stringified notifications filter, the values are the paginated notifications.
   */
  #cache: Cache<ListNotificationsResponse>;

  constructor() {
    this.#emitter = NovuEventEmitter.getInstance();
    notificationEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent());
    });
    notificationEventsThatRemove.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent({ remove: true }));
    });
    notificationsEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationsEvent());
    });
    notificationsEventsThatRemove.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationsEvent({ remove: true }));
    });
    this.#cache = new InMemoryCache();
  }

  private updateNotificationInCache = (key: string, data: Notification): boolean => {
    const notificationsResponse = this.#cache.get(key);
    if (!notificationsResponse) {
      return false;
    }

    const index = notificationsResponse.notifications.findIndex((el) => el.id === data.id);
    if (index === -1) {
      return false;
    }

    const updatedNotifications = [...notificationsResponse.notifications];
    updatedNotifications[index] = data;

    this.#cache.set(key, { ...notificationsResponse, notifications: updatedNotifications });

    return true;
  };

  private removeNotificationInCache = (key: string, data: Notification): boolean => {
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
    ({ data }: { data?: Notification }): void => {
      if (!data) {
        return;
      }

      const uniqueFilterKeys = new Set<string>();
      this.#cache.keys().forEach((key) => {
        let isNotificationFound = false;
        if (remove) {
          isNotificationFound = this.removeNotificationInCache(key, data);
        } else {
          isNotificationFound = this.updateNotificationInCache(key, data);
        }

        if (isNotificationFound) {
          uniqueFilterKeys.add(getFilterKey(getFilter(key)));
        }
      });

      uniqueFilterKeys.forEach((key) => {
        const notificationsResponse = this.getAggregated(getFilter(key));
        this.#emitter.emit('notifications.list.updated', {
          data: notificationsResponse,
        });
      });
    };

  private handleNotificationsEvent =
    ({ remove }: { remove: boolean } = { remove: false }) =>
    ({ data }: { data?: Notification[] }): void => {
      if (!data) {
        return;
      }

      const uniqueFilterKeys = new Set<string>();
      this.#cache.keys().forEach((key) => {
        data.forEach((notification) => {
          let isNotificationFound = false;
          if (remove) {
            isNotificationFound = this.removeNotificationInCache(key, notification);
          } else {
            isNotificationFound = this.updateNotificationInCache(key, notification);
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

  private has(args: ListNotificationsArgs): boolean {
    return this.#cache.get(getCacheKey(args)) !== undefined;
  }

  private getAggregated(filter: NotificationFilter): ListNotificationsResponse {
    const cacheKeys = this.#cache.keys().filter((key) => {
      const parsedFilter = getFilter(key);

      return isSameFilter(parsedFilter, filter);
    });

    return cacheKeys
      .map((key) => this.#cache.get(key))
      .reduce<ListNotificationsResponse>(
        (acc, el) => {
          if (!el) {
            return acc;
          }

          return {
            hasMore: el.hasMore,
            filter: el.filter,
            notifications: [...acc.notifications, ...el.notifications],
          };
        },
        { hasMore: false, filter: {}, notifications: [] }
      );
  }

  set(args: ListNotificationsArgs, data: ListNotificationsResponse): void {
    this.#cache.set(getCacheKey(args), data);
  }

  getAll(args: ListNotificationsArgs): ListNotificationsResponse | undefined {
    if (this.has(args)) {
      return this.getAggregated({ tags: args.tags, read: args.read, archived: args.archived });
    }

    return;
  }

  /**
   * Get unique notifications based on specified filter fields.
   * The same tags can be applied to multiple filters which means that the same notification can be duplicated.
   */
  getUniqueNotifications({ tags, read }: Pick<ListNotificationsArgs, 'tags' | 'read'>): Array<Notification> {
    const keys = this.#cache.keys();
    const uniqueNotifications = new Map<string, Notification>();

    keys.forEach((key) => {
      const filter = getFilter(key);
      if (areTagsEqual(tags, filter.tags)) {
        const value = this.#cache.get(key);
        if (!value) {
          return;
        }

        value.notifications
          .filter((el) => typeof read === 'undefined' || read === el.isRead)
          .forEach((notification) => uniqueNotifications.set(notification.id, notification));
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
