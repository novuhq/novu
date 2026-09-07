import { Accessor, createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js';
import { NOTIFICATION_COUNT_SYNC_EVENTS } from '../../../notifications/count-sync-events';
import type { Novu } from '../../../novu';
import { Notification, NotificationFilter, SeverityLevelEnum } from '../../../types';
import { checkNotificationMatchesFilter } from '../../../utils/notification-utils';
import { createNovuEventEffect, createWebSocketEventEffect } from './events';
import { getTagsFromTab, type InboxStore } from './inbox';

const MIN_AMOUNT_OF_NOTIFICATIONS = 1;

export type UnreadCount = { total: number; severity: Record<string, number> };

export type CountsStore = {
  unreadCount: Accessor<UnreadCount>;
  unreadCounts: Accessor<Map<string, number>>;
  newNotificationCounts: Accessor<Map<string, number>>;
  resetNewNotificationCounts: (key: string) => void;
  /**
   * Starts fetching counts and listening to the websocket. Returns the release function; the work stops when
   * the last subscriber releases, so an instance that never shows counts pays nothing.
   */
  activate: () => () => void;
};

export type CountsFilter = Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;

export const createCountsKey = (filter: CountsFilter) => {
  return JSON.stringify({ tags: filter.tags ?? [], data: filter.data ?? {}, severity: filter.severity });
};

const emptySeverityCounts = (): Record<string, number> => ({
  [SeverityLevelEnum.HIGH]: 0,
  [SeverityLevelEnum.MEDIUM]: 0,
  [SeverityLevelEnum.LOW]: 0,
  [SeverityLevelEnum.NONE]: 0,
});

/** Unread counts for the bell and the tabs, plus the "new messages" counters shown while the list is open. */
export const createCountsStore = ({ novu, inbox }: { novu: Accessor<Novu>; inbox: InboxStore }): CountsStore => {
  const [unreadCount, setUnreadCount] = createSignal<UnreadCount>({ total: 0, severity: emptySeverityCounts() });
  const [unreadCounts, setUnreadCounts] = createSignal(new Map<string, number>());
  const [newNotificationCounts, setNewNotificationCounts] = createSignal(new Map<string, number>());
  let refreshGeneration = 0;
  let subscribers = 0;
  let dispose: (() => void) | undefined;

  const refreshCounts = async () => {
    const generation = ++refreshGeneration;
    const client = novu();
    const bellFilters = [
      SeverityLevelEnum.HIGH,
      SeverityLevelEnum.MEDIUM,
      SeverityLevelEnum.LOW,
      SeverityLevelEnum.NONE,
    ].map((severity) => ({
      read: false,
      archived: false,
      snoozed: false,
      severity,
    }));

    const currentTabs = inbox.tabs();
    const tabFilters =
      currentTabs.length > 0
        ? currentTabs.map((tab) => ({
            tags: getTagsFromTab(tab),
            read: false,
            archived: false,
            snoozed: false,
            data: tab.filter?.data,
            severity: tab.filter?.severity,
          }))
        : null;

    const [bellResult, tabResult] = await Promise.all([
      client.notifications.count({ filters: bellFilters }),
      tabFilters ? client.notifications.count({ filters: tabFilters }) : Promise.resolve(null),
    ]);

    if (generation !== refreshGeneration) {
      return;
    }

    if (bellResult.data) {
      const severity = emptySeverityCounts();
      let total = 0;

      for (const item of bellResult.data.counts) {
        const filterSeverity = item.filter.severity;
        const severityKey = Array.isArray(filterSeverity) ? filterSeverity[0] : filterSeverity;

        if (severityKey && severityKey in severity) {
          severity[severityKey] = item.count;
          total += item.count;
        }
      }

      setUnreadCount({ total, severity });
    }

    if (tabResult?.data) {
      const newMap = new Map<string, number>();

      for (let i = 0; i < tabResult.data.counts.length; i += 1) {
        const countItem = tabResult.data.counts[i];
        const tagsKey = createCountsKey({
          tags: countItem.filter.tags,
          data: countItem.filter.data,
          severity: countItem.filter.severity,
        });
        newMap.set(tagsKey, countItem.count);
      }

      setUnreadCounts(newMap);
    }
  };

  const updateNewNotificationCountsOrCache = (
    tabLabel: string,
    notification: Notification,
    tags: NotificationFilter['tags'],
    data?: NotificationFilter['data'],
    severity?: NotificationFilter['severity']
  ) => {
    const notificationsCache = novu().notifications.cache;
    const limitValue = inbox.limit();
    // Use the global filter() as a base and override with specific tab's tags and data for cache operations
    const tabSpecificFilterForCache = { ...inbox.filter(), tags, data, severity, after: undefined, limit: limitValue };

    const hasEmptyCache = !notificationsCache.has(tabSpecificFilterForCache);
    if (hasEmptyCache && (!inbox.isOpened() || inbox.activeTab() !== tabLabel)) {
      return;
    }

    const cachedData = notificationsCache.getAll(tabSpecificFilterForCache) || {
      hasMore: false,
      filter: tabSpecificFilterForCache,
      notifications: [],
    };
    const hasLessThenMinAmount = (cachedData?.notifications.length || 0) < MIN_AMOUNT_OF_NOTIFICATIONS;

    // Auto-load notifications when:
    // 1. Cache is nearly empty
    // 2. OR inbox is closed (will be auto-loaded when opened)
    if (hasLessThenMinAmount || !inbox.isOpened()) {
      notificationsCache.update(tabSpecificFilterForCache, {
        ...cachedData,
        notifications: [notification, ...cachedData.notifications],
      });

      return;
    }

    // Only show banner when inbox is already open and new notification is received
    setNewNotificationCounts((oldMap) => {
      const key = createCountsKey({ tags, data, severity }); // Use specific tab's tags and data for the key

      const newMap = new Map(oldMap);
      newMap.set(key, (oldMap.get(key) || 0) + 1);

      return newMap;
    });
  };

  const start = () =>
    createRoot((disposeRoot) => {
      createEffect(() => {
        // read the novu instance to trigger the effect
        novu();
        refreshCounts();
      });

      createWebSocketEventEffect(novu, 'notifications.unread_count_changed', (data) => {
        setUnreadCount(data.result);
        refreshCounts();
      });

      createEffect(() => {
        const client = novu();
        const cleanups = NOTIFICATION_COUNT_SYNC_EVENTS.map((event) =>
          client.on(event, (payload) => {
            if ('error' in payload && payload.error) {
              return;
            }

            refreshCounts();
          })
        );

        onCleanup(() => cleanups.forEach((cleanup) => cleanup()));
      });

      createNovuEventEffect(novu, 'session.initialize.resolved', ({ data }) => {
        if (!data) {
          return;
        }

        setUnreadCount(data.unreadCount);
      });

      createWebSocketEventEffect(novu, 'notifications.notification_received', async ({ result: notification }) => {
        if (inbox.filter().archived || inbox.filter().snoozed) {
          return;
        }

        const currentTabs = inbox.tabs();
        const processedFilters = new Set<string>();

        if (currentTabs.length > 0) {
          for (const tab of currentTabs) {
            const tabTags = getTagsFromTab(tab);
            const tabFilter: NotificationFilter = {
              tags: tabTags,
              read: false,
              archived: false,
              snoozed: false,
              data: tab.filter?.data,
              severity: tab.filter?.severity,
            };

            if (!checkNotificationMatchesFilter(notification, tabFilter)) {
              continue;
            }

            const filterKey = createCountsKey({
              tags: tabTags,
              data: tab.filter?.data,
              severity: tab.filter?.severity,
            });

            if (!processedFilters.has(filterKey)) {
              processedFilters.add(filterKey);
              updateNewNotificationCountsOrCache(
                tab.label,
                notification,
                tabTags,
                tab.filter?.data,
                tab.filter?.severity
              );
            }
          }
        } else {
          updateNewNotificationCountsOrCache('', notification, [], undefined, undefined);
        }

        await refreshCounts();
      });

      return disposeRoot;
    });

  const activate = () => {
    subscribers += 1;
    if (subscribers === 1) {
      dispose = start();
    }

    let released = false;

    return () => {
      if (released) {
        return;
      }
      released = true;
      subscribers -= 1;
      if (subscribers === 0) {
        dispose?.();
        dispose = undefined;
      }
    };
  };

  const resetNewNotificationCounts = (key: string) => {
    setNewNotificationCounts((oldMap) => {
      const newMap = new Map(oldMap);
      newMap.set(key, 0);

      return newMap;
    });
  };

  return { unreadCount, unreadCounts, newNotificationCounts, resetNewNotificationCounts, activate };
};

export const selectNewMessagesCount = (store: CountsStore, filter: Accessor<CountsFilter>) => {
  const key = createMemo(() => createCountsKey(filter()));
  const count = createMemo(() => store.newNotificationCounts().get(key()) || 0);
  const reset = () => store.resetNewNotificationCounts(key());

  return { count, reset };
};
