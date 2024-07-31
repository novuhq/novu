import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';
import type { ListNotificationsArgs, ListNotificationsResponse, Notification } from '../notifications';
import { NotificationEvents, NotificationsEvents, NovuEventEmitter } from '../event-emitter';
import type { NotificationFilter } from '../types';

const getFilterKey = ({ tags, read, archived }: Pick<ListNotificationsArgs, 'tags' | 'read' | 'archived'>): string => {
  return JSON.stringify({ tags, read, archived });
};

const getPageKey = ({ limit, offset, after }: Pick<ListNotificationsArgs, 'limit' | 'offset' | 'after'>): string => {
  return JSON.stringify({ limit, offset, after });
};

const singleNotificationEvents: NotificationEvents[] = [
  'notification.read.pending',
  'notification.read.resolved',
  'notification.unread.pending',
  'notification.unread.resolved',
  'notification.archive.pending',
  'notification.archive.resolved',
  'notification.unarchive.pending',
  'notification.unarchive.resolved',
  'notification.complete_action.pending',
  'notification.complete_action.resolved',
  'notification.revert_action.pending',
  'notification.revert_action.resolved',
];

const multipleNotificationEvents: NotificationsEvents[] = [
  'notifications.read_all.pending',
  'notifications.read_all.resolved',
  'notifications.archive_all.pending',
  'notifications.archive_all.resolved',
  'notifications.archive_all_read.pending',
  'notifications.archive_all_read.resolved',
];

export class NotificationsCache {
  #emitter: NovuEventEmitter;
  /**
   * The key is the stringified notifications filter, the value is the pagination cache
   * where the key is pagination arguments and the value is the list of notifications.
   */
  #cache: Cache<Cache<ListNotificationsResponse>>;
  /**
   * The key is the stringified notifications filter, the value is the set of unique notification ids.
   */
  #idsCache: Cache<Set<string>>;

  constructor() {
    this.#emitter = NovuEventEmitter.getInstance();
    singleNotificationEvents.forEach((event) => {
      this.#emitter.on(event, this.handleSingleNotificationEvent);
    });
    multipleNotificationEvents.forEach((event) => {
      this.#emitter.on(event, this.handleMultipleNotificationsEvent);
    });
    this.#cache = new InMemoryCache();
    this.#idsCache = new InMemoryCache();
  }

  private getFilterCache = (args: ListNotificationsArgs): Cache<ListNotificationsResponse> | undefined => {
    return this.#cache.get(getFilterKey(args));
  };

  private updateNotificationInCache = (cache: Cache<ListNotificationsResponse>, data: Notification): void => {
    const allCache = cache.pairs();

    allCache.forEach(([key, el]) => {
      const index = el.notifications.findIndex((notification) => notification.id === data.id);
      if (index === -1) {
        return;
      }

      const updatedNotifications = [...el.notifications];
      updatedNotifications[index] = data;

      cache.set(key, { ...el, notifications: updatedNotifications });
    });
  };

  private handleSingleNotificationEvent = ({ data }: { data?: Notification }): void => {
    if (!data) {
      return;
    }

    const filterKeysToUpdate = this.#idsCache.keys().filter((key) => {
      const cache = this.#idsCache.get(key);

      return cache?.has(data.id);
    });

    filterKeysToUpdate.forEach((key) => {
      const filterCache = this.#cache.get(key);
      if (!filterCache) {
        return;
      }

      this.updateNotificationInCache(filterCache, data);

      const notificationsResponse = this.getReducedNotifications(filterCache);
      this.#emitter.emit('notifications.list.updated', {
        data: notificationsResponse,
      });
    });
  };

  private handleMultipleNotificationsEvent = ({ data }: { data?: Notification[] }): void => {
    if (!data) {
      return;
    }

    const notificationIds = data.map((notification) => notification.id);
    const filterKeysToUpdate = this.#idsCache.keys().filter((key) => {
      const idsSet = this.#idsCache.get(key);

      return notificationIds.some((id) => idsSet?.has(id));
    });

    filterKeysToUpdate.forEach((key) => {
      const filterCache = this.#cache.get(key);
      if (!filterCache) {
        return;
      }

      data.forEach((notification) => this.updateNotificationInCache(filterCache, notification));

      const notificationsResponse = this.getReducedNotifications(filterCache);
      this.#emitter.emit('notifications.list.updated', {
        data: notificationsResponse,
      });
    });
  };

  private has(args: ListNotificationsArgs): boolean {
    const pageKey = getPageKey(args);
    const filterCache = this.getFilterCache(args);

    return filterCache?.get(pageKey) !== undefined;
  }

  private getReducedNotifications(filterCache: Cache<ListNotificationsResponse>): ListNotificationsResponse {
    const values = filterCache.getValues();

    return values.reduce<ListNotificationsResponse>(
      (acc, el) => {
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
    const filterKey = getFilterKey(args);
    const pageKey = getPageKey(args);
    const filterCache = this.getFilterCache(args) ?? new InMemoryCache();
    filterCache.set(pageKey, data);
    this.#cache.set(filterKey, filterCache);

    const uniqueIds = this.#idsCache.get(filterKey) ?? new Set();
    data.notifications.forEach((el) => uniqueIds.add(el.id));
    this.#idsCache.set(filterKey, uniqueIds);
  }

  getAll(args: ListNotificationsArgs): ListNotificationsResponse | undefined {
    const filterCache = this.getFilterCache(args);
    if (this.has(args) && filterCache) {
      return this.getReducedNotifications(filterCache);
    }

    return;
  }

  getUniqueNotifications({ tags }: Pick<ListNotificationsArgs, 'tags'>): Array<Notification> {
    const keys = this.#cache.keys();

    const uniqueNotifications = new Map<string, Notification>();
    keys.forEach((key) => {
      const filter: NotificationFilter = JSON.parse(key);
      if (!tags || tags?.every((tag) => filter.tags?.includes(tag))) {
        const filterCache = this.#cache.get(key);
        if (!filterCache) {
          return;
        }

        filterCache
          .getValues()
          .map((el) => el.notifications)
          .flat()
          .forEach((notification) => uniqueNotifications.set(notification.id, notification));
      }
    });

    return Array.from(uniqueNotifications.values());
  }

  clear(filter: NotificationFilter): void {
    const filterKey = getFilterKey(filter);
    this.#cache.remove(filterKey);
    this.#idsCache.remove(filterKey);
  }

  clearAll(): void {
    this.#cache.clear();
    this.#idsCache.clear();
  }
}
