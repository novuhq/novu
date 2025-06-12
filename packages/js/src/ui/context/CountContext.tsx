import { Accessor, createContext, createMemo, createSignal, onMount, ParentProps, useContext } from 'solid-js';
import { Notification, NotificationFilter } from '../../types';
import { getTagsFromTab } from '../helpers';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { useWebSocketEvent } from '../helpers/useWebSocketEvent';
import { useInboxContext } from './InboxContext';
import { useNovu } from './NovuContext';

const MIN_AMOUNT_OF_NOTIFICATIONS = 1;

type CountContextValue = {
  totalUnreadCount: Accessor<number>;
  unreadCounts: Accessor<Map<string, number>>;
  newNotificationCounts: Accessor<Map<string, number>>;
  resetNewNotificationCounts: (key: string) => void;
};

const CountContext = createContext<CountContextValue>(undefined);

export const CountProvider = (props: ParentProps) => {
  const novu = useNovu();
  const { isOpened, tabs, filter, limit } = useInboxContext();
  const [totalUnreadCount, setTotalUnreadCount] = createSignal(0);
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
    }));
    const { data } = await novu.notifications.count({ filters });
    if (!data) {
      return;
    }

    const newMap = new Map();
    const { counts } = data;
    for (let i = 0; i < counts.length; i += 1) {
      const tagsKey = createKey(counts[i].filter.tags, counts[i].filter.data);
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
      setTotalUnreadCount(data.result);
      updateTabCounts();
    },
  });

  useNovuEvent({
    event: 'session.initialize.resolved',
    eventHandler: ({ data }) => {
      if (!data) {
        return;
      }

      setTotalUnreadCount(data.totalUnreadCount);
    },
  });

  const updateNewNotificationCountsOrCache = (
    notification: Notification,
    tags: string[],
    data?: NotificationFilter['data']
  ) => {
    const notificationsCache = novu.notifications.cache;
    const limitValue = limit();
    // Use the global filter() as a base and override with specific tab's tags and data for cache operations
    const tabSpecificFilterForCache = { ...filter(), tags, data, after: undefined, limit: limitValue };

    const hasEmptyCache = !notificationsCache.has(tabSpecificFilterForCache);
    if (!isOpened() && hasEmptyCache) {
      return;
    }

    const cachedData = notificationsCache.getAll(tabSpecificFilterForCache) || {
      hasMore: false,
      filter: tabSpecificFilterForCache,
      notifications: [],
    };
    const hasLessThenMinAmount = (cachedData?.notifications.length || 0) < MIN_AMOUNT_OF_NOTIFICATIONS;

    if (hasLessThenMinAmount) {
      notificationsCache.update(tabSpecificFilterForCache, {
        ...cachedData,
        notifications: [notification, ...cachedData.notifications],
      });

      return;
    }

    setNewNotificationCounts((oldMap) => {
      const key = createKey(tags, data); // Use specific tab's tags and data for the key
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

      // Helper function to check if notification data matches tab's data filter criteria
      function checkNotificationDataAgainstTabData(
        notificationData: Notification['data'],
        tabFilterData: NotificationFilter['data']
      ): boolean {
        if (!tabFilterData || Object.keys(tabFilterData).length === 0) {
          // No data filter defined on the tab, so it's a match on the data aspect.
          return true;
        }
        if (!notificationData) {
          // Tab has a data filter, but the notification has no data.
          return false;
        }

        return Object.entries(tabFilterData).every(([key, filterValue]) => {
          const notifValue = notificationData[key];

          if (notifValue === undefined && filterValue !== undefined) {
            // Key is specified in tab's data filter, but this key is not present in the notification's data.
            return false;
          }

          if (Array.isArray(filterValue)) {
            if (Array.isArray(notifValue)) {
              /*
               * Both filter value and notification value are arrays.
               * Check for set equality (same elements, regardless of order).
               */
              if (filterValue.length !== notifValue.length) return false;
              /*
               * Ensure elements are of primitive types for direct sort and comparison.
               * If elements can be objects, a more sophisticated comparison is needed.
               */
              const sortedFilterValue = [...(filterValue as (string | number | boolean)[])].sort();
              const sortedNotifValue = [...(notifValue as (string | number | boolean)[])].sort();

              return sortedFilterValue.every((val, index) => val === sortedNotifValue[index]);
            } else {
              /*
               * Filter value is an array, notification value is scalar.
               * Check if the scalar notification value is present in the filter array.
               */
              return (filterValue as unknown[]).includes(notifValue);
            }
          } else {
            // Filter value is scalar. Notification value must be equal.
            return notifValue === filterValue;
          }
        });
      }

      if (currentTabs.length > 0) {
        for (const tab of currentTabs) {
          const tabTags = getTagsFromTab(tab);
          const tabDataFilterCriteria = tab.filter?.data;

          const matchesTagFilter =
            tabTags.length === 0 || (notification.tags && tabTags.some((tag) => notification.tags!.includes(tag)));

          const matchesDataFilterCriteria = checkNotificationDataAgainstTabData(
            notification.data,
            tabDataFilterCriteria
          );

          if (matchesTagFilter && matchesDataFilterCriteria) {
            updateNewNotificationCountsOrCache(notification, tabTags, tabDataFilterCriteria);
          }
        }
      } else {
        // No tabs are defined. Apply to default (no tags, no data) filter.
        updateNewNotificationCountsOrCache(notification, [], undefined);
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
    <CountContext.Provider
      value={{ totalUnreadCount, unreadCounts, newNotificationCounts, resetNewNotificationCounts }}
    >
      {props.children}
    </CountContext.Provider>
  );
};

const createKey = (tags?: NotificationFilter['tags'], data?: NotificationFilter['data']) => {
  return JSON.stringify({ tags: tags ?? [], data: data ?? {} });
};

export const useTotalUnreadCount = () => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useTotalUnreadCount must be used within a CountProvider');
  }

  return { totalUnreadCount: context.totalUnreadCount };
};

type UseNewMessagesCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data'>;
};

export const useNewMessagesCount = (props: UseNewMessagesCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useNewMessagesCount must be used within a CountProvider');
  }

  const key = createMemo(() => createKey(props.filter.tags, props.filter.data));
  const count = createMemo(() => context.newNotificationCounts().get(key()) || 0);
  const reset = () => context.resetNewNotificationCounts(key());

  return { count, reset };
};

type UseUnreadCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data'>;
};
export const useUnreadCount = (props: UseUnreadCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within a CountProvider');
  }

  const count = createMemo(() => context.unreadCounts().get(createKey(props.filter.tags, props.filter.data)) || 0);

  return count;
};

type UseUnreadCountsProps = {
  filters: Pick<NotificationFilter, 'tags' | 'data'>[];
};
export const useUnreadCounts = (props: UseUnreadCountsProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCounts must be used within a CountProvider');
  }

  const counts = createMemo(() =>
    props.filters.map((filter) => {
      return context.unreadCounts().get(createKey(filter.tags, filter.data)) || 0;
    })
  );

  return counts;
};
