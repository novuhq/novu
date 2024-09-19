import { Accessor, createContext, createMemo, createSignal, onMount, ParentProps, useContext } from 'solid-js';
import { NotificationFilter, Notification } from '../../types';
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
    const filters = tabs().map((tab) => ({ tags: getTagsFromTab(tab), read: false, archived: false }));
    const { data } = await novu.notifications.count({ filters });
    if (!data) {
      return;
    }

    const newMap = new Map();
    const { counts } = data;
    for (let i = 0; i < counts.length; i += 1) {
      const tagsKey = createKey(counts[i].filter.tags);
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

  const updateNewNotificationCountsOrCache = (notification: Notification, tags: string[]) => {
    const notificationsCache = novu.notifications.cache;
    const limitValue = limit();
    const tabFilter = { ...filter(), tags, offset: 0, limit: limitValue };
    const hasEmptyCache = !notificationsCache.has(tabFilter);
    if (!isOpened() && hasEmptyCache) {
      return;
    }

    const cachedData = notificationsCache.getAll(tabFilter) || { hasMore: false, filter: tabFilter, notifications: [] };
    const hasLessThenMinAmount = (cachedData?.notifications.length || 0) < MIN_AMOUNT_OF_NOTIFICATIONS;
    if (hasLessThenMinAmount) {
      notificationsCache.update(tabFilter, {
        ...cachedData,
        notifications: [notification, ...cachedData.notifications],
      });

      return;
    }

    setNewNotificationCounts((oldMap) => {
      const tagsKey = createKey(tags);
      const newMap = new Map(oldMap);
      newMap.set(tagsKey, (oldMap.get(tagsKey) || 0) + 1);

      return newMap;
    });
  };

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async ({ result: notification }) => {
      if (filter().archived) {
        return;
      }

      const allTabs = tabs();
      if (allTabs.length > 0) {
        for (let i = 0; i < allTabs.length; i += 1) {
          const tab = allTabs[i];
          const tags = getTagsFromTab(tab);
          const allNotifications = tags.length === 0;
          const includesAtLeastOneTag = tags.some((tag) => notification.tags?.includes(tag));
          if (!allNotifications && !includesAtLeastOneTag) {
            continue;
          }

          updateNewNotificationCountsOrCache(notification, tags);
        }
      } else {
        updateNewNotificationCountsOrCache(notification, []);
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

const createKey = (tags?: NotificationFilter['tags']) => {
  return JSON.stringify({ tags: tags ?? [] });
};

export const useTotalUnreadCount = () => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useTotalUnreadCount must be used within a CountProvider');
  }

  return { totalUnreadCount: context.totalUnreadCount };
};

type UseNewMessagesCountProps = {
  filter: Pick<NotificationFilter, 'tags'>;
};
export const useNewMessagesCount = (props: UseNewMessagesCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useNewMessagesCount must be used within a CountProvider');
  }

  const key = createMemo(() => createKey(props.filter.tags));
  const count = createMemo(() => context.newNotificationCounts().get(key()) || 0);
  const reset = () => context.resetNewNotificationCounts(key());

  return { count, reset };
};

type UseUnreadCountProps = {
  filter: Pick<NotificationFilter, 'tags'>;
};
export const useUnreadCount = (props: UseUnreadCountProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within a CountProvider');
  }

  const count = createMemo(() => context.unreadCounts().get(createKey(props.filter.tags)) || 0);

  return count;
};

type UseUnreadCountsProps = {
  filters: Pick<NotificationFilter, 'tags'>[];
};
export const useUnreadCounts = (props: UseUnreadCountsProps) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useUnreadCounts must be used within a CountProvider');
  }

  const counts = createMemo(() =>
    props.filters.map((filter) => {
      return context.unreadCounts().get(createKey(filter.tags)) || 0;
    })
  );

  return counts;
};
