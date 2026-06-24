import { Accessor, createContext, createEffect, createMemo, createSignal, onCleanup, ParentProps, useContext } from 'solid-js';
import { NOTIFICATION_COUNT_SYNC_EVENTS } from '../../notifications/count-sync-events';
import { Notification, NotificationFilter, SeverityLevelEnum } from '../../types';
import { checkNotificationMatchesFilter } from '../../utils/notification-utils';
import { getTagsFromTab } from '../helpers';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { useWebSocketEvent } from '../helpers/useWebSocketEvent';
import { useInboxContext } from './InboxContext';
import { useNovu } from './NovuContext';

const MIN_AMOUNT_OF_NOTIFICATIONS = 1;

type CountContextValue = {
  unreadCount: Accessor<{ total: number; severity: Record<string, number> }>;
  unreadCounts: Accessor<Map<string, number>>;
  newNotificationCounts: Accessor<Map<string, number>>;
  resetNewNotificationCounts: (key: string) => void;
};

const CountContext = createContext<CountContextValue>(undefined);

export const CountProvider = (props: ParentProps) => {
  const novuAccessor = useNovu();
  const { isOpened, tabs, filter, limit, activeTab } = useInboxContext();
  const [unreadCount, setUnreadCount] = createSignal<{ total: number; severity: Record<string, number> }>({
    total: 0,
    severity: {
      [SeverityLevelEnum.HIGH]: 0,
      [SeverityLevelEnum.MEDIUM]: 0,
      [SeverityLevelEnum.LOW]: 0,
      [SeverityLevelEnum.NONE]: 0,
    },
  });
  const [unreadCounts, setUnreadCounts] = createSignal(new Map<string, number>());
  const [newNotificationCounts, setNewNotificationCounts] = createSignal(new Map<string, number>());
  let refreshGeneration = 0;

  const emptySeverityCounts = (): Record<string, number> => ({
    [SeverityLevelEnum.HIGH]: 0,
    [SeverityLevelEnum.MEDIUM]: 0,
    [SeverityLevelEnum.LOW]: 0,
    [SeverityLevelEnum.NONE]: 0,
  });

  const refreshCounts = async () => {
    const generation = ++refreshGeneration;
    const novu = novuAccessor();
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

    const currentTabs = tabs();
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
      novu.notifications.count({ filters: bellFilters }),
      tabFilters ? novu.notifications.count({ filters: tabFilters }) : Promise.resolve(null),
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
        const tagsKey = createKey({
          tags: countItem.filter.tags,
          data: countItem.filter.data,
          severity: countItem.filter.severity,
        });
        newMap.set(tagsKey, countItem.count);
      }

      setUnreadCounts(newMap);
    }
  };

  createEffect(() => {
    // read the novu instance to trigger the effect
    novuAccessor();
    refreshCounts();
  });

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: (data) => {
      setUnreadCount(data.result);
      refreshCounts();
    },
  });

  createEffect(() => {
    const novu = novuAccessor();
    const cleanups = NOTIFICATION_COUNT_SYNC_EVENTS.map((event) =>
      novu.on(event, (payload) => {
        if ('error' in payload && payload.error) {
          return;
        }

        refreshCounts();
      })
    );

    onCleanup(() => cleanups.forEach((cleanup) => cleanup()));
  });

  useNovuEvent({
    event: 'session.initialize.resolved',
    eventHandler: ({ data }) => {
      if (!data) {
        return;
      }

      setUnreadCount(data.unreadCount);
    },
  });

  const updateNewNotificationCountsOrCache = (
    tabLabel: string,
    notification: Notification,
    tags: NotificationFilter['tags'],
    data?: NotificationFilter['data'],
    severity?: NotificationFilter['severity']
  ) => {
    const notificationsCache = novuAccessor().notifications.cache;
    const limitValue = limit();
    // Use the global filter() as a base and override with specific tab's tags and data for cache operations
    const tabSpecificFilterForCache = { ...filter(), tags, data, severity, after: undefined, limit: limitValue };

    const hasEmptyCache = !notificationsCache.has(tabSpecificFilterForCache);
    if (hasEmptyCache && (!isOpened() || activeTab() !== tabLabel)) {
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
    if (hasLessThenMinAmount || !isOpened()) {
      notificationsCache.update(tabSpecificFilterForCache, {
        ...cachedData,
        notifications: [notification, ...cachedData.notifications],
      });

      return;
    }

    // Only show banner when inbox is already open and new notification is received
    setNewNotificationCounts((oldMap) => {
      const key = createKey({ tags, data, severity }); // Use specific tab's tags and data for the key

      const newMap = new Map(oldMap);
      newMap.set(key, (oldMap.get(key) || 0) + 1);

      return newMap;
    });
  };

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async ({ result: notification }) => {
      if (filter().archived || filter().snoozed) {
        return;
      }

      const currentTabs = tabs();
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

          const filterKey = createKey({
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
    },
  });

  const resetNewNotificationCounts = (key: string) => {
    setNewNotificationCounts((oldMap) => {
      const newMap = new Map(oldMap);
      newMap.set(key, 0);

      return newMap;
    });
  };

  return (
    <CountContext.Provider value={{ unreadCount, unreadCounts, newNotificationCounts, resetNewNotificationCounts }}>
      {props.children}
    </CountContext.Provider>
  );
};

const createKey = (filter: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>) => {
  return JSON.stringify({ tags: filter.tags ?? [], data: filter.data ?? {}, severity: filter.severity });
};

export const useUnreadCount = () => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within a CountProvider');
  }

  return { unreadCount: context.unreadCount };
};

type UseNewMessagesCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;
};

export const useNewMessagesCount = (props: UseNewMessagesCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useNewMessagesCount must be used within a CountProvider');
  }

  const key = createMemo(() => createKey(props.filter));
  const count = createMemo(() => context.newNotificationCounts().get(key()) || 0);
  const reset = () => context.resetNewNotificationCounts(key());

  return { count, reset };
};

type UseFilteredUnreadCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;
};
export const useFilteredUnreadCount = (props: UseFilteredUnreadCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useFilteredUnreadCount must be used within a CountProvider');
  }

  const count = createMemo(() => context.unreadCounts().get(createKey(props.filter)) || 0);

  return count;
};

type UseUnreadCountsProps = {
  filters: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>[];
};
export const useUnreadCounts = (props: UseUnreadCountsProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCounts must be used within a CountProvider');
  }

  const counts = createMemo(() =>
    props.filters.map((filter) => {
      return context.unreadCounts().get(createKey(filter)) || 0;
    })
  );

  return counts;
};
