import { NotificationEvents, NovuEventEmitter } from '../event-emitter';
import type { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import type { NotificationFilter } from '../types';
import { areTagsEqual, isSameFilter } from '../utils/notification-utils';
import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';

const excludeEmpty = ({ tags, read, archived, limit, offset, after }: ListNotificationsArgs) =>
  Object.entries({ tags, read, archived, limit, offset, after })
    .filter(([_, value]) => value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0))
    .reduce((acc, [key, value]) => {
      // @ts-expect-error
      acc[key] = value;

      return acc;
    }, {});

const getCacheKey = ({ tags, read, archived, limit, offset, after }: ListNotificationsArgs): string => {
  return JSON.stringify(excludeEmpty({ tags, read, archived, limit, offset, after }));
};

const getFilterKey = ({ tags, read, archived }: Pick<ListNotificationsArgs, 'tags' | 'read' | 'archived'>): string => {
  return JSON.stringify(excludeEmpty({ tags, read, archived }));
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
  'notifications.archive_all.pending',
  'notifications.archive_all_read.pending',
];

export class NotificationsCache {
  #emitter: NovuEventEmitter;
  /**
   * The key is the stringified notifications filter, the values are the paginated notifications.
   */
  #cache: Cache<ListNotificationsResponse>;

  constructor({ emitter }: { emitter: NovuEventEmitter }) {
    this.#emitter = emitter;
    updateEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent());
    });
    removeEvents.forEach((event) => {
      this.#emitter.on(event, this.handleNotificationEvent({ remove: true }));
    });
    this.#cache = new InMemoryCache();
  }

  private updateNotification = (key: string, data: Notification): boolean => {
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
    ({ data }: { data?: Notification | Notification[] }): void => {
      if (!data) {
        return;
      }

      const notifications = Array.isArray(data) ? data : [data];

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

  has(args: ListNotificationsArgs): boolean {
    return this.#cache.get(getCacheKey(args)) !== undefined;
  }

  set(args: ListNotificationsArgs, data: ListNotificationsResponse): void {
    this.#cache.set(getCacheKey(args), data);
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
      return this.getAggregated({ tags: args.tags, read: args.read, archived: args.archived });
    }
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
