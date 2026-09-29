import { Accessor, createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js';
import { NOTIFICATION_COUNT_SYNC_EVENTS } from '../../../notifications/count-sync-events';
import type { Novu } from '../../../novu';
import { Notification, NotificationFilter, SeverityLevelEnum } from '../../../types';
import { checkNotificationMatchesFilter } from '../../../utils/notification-utils';
import type { Tab } from '../../types';
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

const BELL_SEVERITIES = [
  SeverityLevelEnum.HIGH,
  SeverityLevelEnum.MEDIUM,
  SeverityLevelEnum.LOW,
  SeverityLevelEnum.NONE,
];

const emptySeverityCounts = (): Record<string, number> => ({
  [SeverityLevelEnum.HIGH]: 0,
  [SeverityLevelEnum.MEDIUM]: 0,
  [SeverityLevelEnum.LOW]: 0,
  [SeverityLevelEnum.NONE]: 0,
});

type CountItem = { count: number; filter: NotificationFilter };

/** One unread filter per severity, so the bell can break its count down. */
const bellFilters = () =>
  BELL_SEVERITIES.map((severity) => ({ read: false, archived: false, snoozed: false, severity }));

/** The unread filter a tab shows; a new notification belongs to the tab when it matches this. */
const tabUnreadFilter = (tab: Tab): NotificationFilter => ({
  tags: getTagsFromTab(tab),
  read: false,
  archived: false,
  snoozed: false,
  data: tab.filter?.data,
  severity: tab.filter?.severity,
});

/** Sums the per-severity results into the bell's unread count. */
const toUnreadCount = (counts: Array<CountItem>): UnreadCount => {
  const severity = emptySeverityCounts();
  let total = 0;

  for (const item of counts) {
    const filterSeverity = item.filter.severity;
    const severityKey = Array.isArray(filterSeverity) ? filterSeverity[0] : filterSeverity;

    if (severityKey && severityKey in severity) {
      severity[severityKey] = item.count;
      total += item.count;
    }
  }

  return { total, severity };
};

/** Keys each tab's result by its filter, the way the tabs look their count up. */
const toTabCounts = (counts: Array<CountItem>) => {
  const tabCounts = new Map<string, number>();

  for (const item of counts) {
    const key = createCountsKey({ tags: item.filter.tags, data: item.filter.data, severity: item.filter.severity });
    tabCounts.set(key, item.count);
  }

  return tabCounts;
};

/** The tabs a notification belongs to, once per distinct filter, since several tabs may share one. */
const matchingTabs = (tabs: Array<Tab>, notification: Notification) => {
  const seen = new Set<string>();
  const matches: Array<{ label: string; filter: NotificationFilter }> = [];

  for (const tab of tabs) {
    const filter = tabUnreadFilter(tab);
    if (!checkNotificationMatchesFilter(notification, filter)) {
      continue;
    }

    const key = createCountsKey({ tags: filter.tags, data: filter.data, severity: filter.severity });
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    matches.push({ label: tab.label, filter });
  }

  return matches;
};

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
    const currentTabs = inbox.tabs();
    const tabFilters = currentTabs.length > 0 ? currentTabs.map(tabUnreadFilter) : null;

    const [bellResult, tabResult] = await Promise.all([
      client.notifications.count({ filters: bellFilters() }),
      tabFilters ? client.notifications.count({ filters: tabFilters }) : Promise.resolve(null),
    ]);

    if (generation !== refreshGeneration) {
      return;
    }

    if (bellResult.data) {
      setUnreadCount(toUnreadCount(bellResult.data.counts));
    }

    if (tabResult?.data) {
      setUnreadCounts(toTabCounts(tabResult.data.counts));
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
        if (currentTabs.length === 0) {
          updateNewNotificationCountsOrCache('', notification, [], undefined, undefined);
        } else {
          for (const { label, filter } of matchingTabs(currentTabs, notification)) {
            updateNewNotificationCountsOrCache(label, notification, filter.tags, filter.data, filter.severity);
          }
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
