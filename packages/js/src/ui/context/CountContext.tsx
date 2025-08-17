import { Accessor, createContext, createMemo, createSignal, onMount, ParentProps, useContext } from 'solid-js';
import { Notification, NotificationFilter, SeverityLevelEnum } from '../../types';
import { checkNotificationDataFilter, checkNotificationTagFilter } from '../../utils/notification-utils';
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
  const novu = useNovu();
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

  const updateTabCounts = async () => {
    if (tabs().length === 0) {
      return;
    }
    const filters = tabs().map((tab) => ({
      tags: getTagsFromTab(tab),
      read: false,
      archived: false,
      snoozed: false,
      data: tab.filter?.data,
      severity: tab.filter?.severity,
    }));
    const { data } = await novu.notifications.count({ filters });
    if (!data) {
      return;
    }

    const newMap = new Map();
    const { counts } = data;
    for (let i = 0; i < counts.length; i += 1) {
      const tagsKey = createKey({
        tags: counts[i].filter.tags,
        data: counts[i].filter.data,
        severity: counts[i].filter.severity,
      });
      newMap.set(tagsKey, data?.counts[i].count);
    }

    setUnreadCounts(newMap);
  };

  onMount(() => {
    updateTabCounts();
  });

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: (data) => {
      setUnreadCount(data.result);
      updateTabCounts();
    },
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
    const notificationsCache = novu.notifications.cache;
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
          const tabDataFilterCriteria = tab.filter?.data;
          const tabSeverityFilterCriteria = tab.filter?.severity;

          const matchesTagFilter = checkNotificationTagFilter(notification.tags, tabTags);
          const matchesDataFilterCriteria = checkNotificationDataFilter(notification.data, tabDataFilterCriteria);

          const matchesSeverityFilterCriteria =
            !tabSeverityFilterCriteria ||
            (Array.isArray(tabSeverityFilterCriteria) && tabSeverityFilterCriteria.length === 0) ||
            (Array.isArray(tabSeverityFilterCriteria) && tabSeverityFilterCriteria.includes(notification.severity)) ||
            (!Array.isArray(tabSeverityFilterCriteria) && tabSeverityFilterCriteria === notification.severity);

          if (matchesTagFilter && matchesDataFilterCriteria && matchesSeverityFilterCriteria) {
            const filterKey = createKey({
              tags: tabTags,
              data: tabDataFilterCriteria,
              severity: tabSeverityFilterCriteria,
            });

            if (!processedFilters.has(filterKey)) {
              processedFilters.add(filterKey);
            updateNewNotificationCountsOrCache(
              tab.label,
              notification,
              tabTags,
              tabDataFilterCriteria,
              tabSeverityFilterCriteria
            );
            }
          }
        }
      } else {
        // No tabs are defined. Apply to default (no tags, no data) filter.
        updateNewNotificationCountsOrCache('', notification, [], undefined, undefined);
      }
    },
  });

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: updateTabCounts,
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
