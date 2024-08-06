import { Accessor, createContext, createMemo, createSignal, ParentProps, useContext } from 'solid-js';
import { NotificationFilter } from '../../types';
import { areTagsEqual } from '../../utils/notification-utils';
import { DEFAULT_FILTER } from '../constants';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { useWebSocketEvent } from '../helpers/useWebSocketEvent';
import { useNovu } from './NovuContext';

type CountContextValue = {
  unreadCounts: Accessor<Map<string, number>>;
  newNotificationCounts: Accessor<Map<string, number>>;
};

const CountContext = createContext<CountContextValue>(undefined);

type CountProviderProps = ParentProps<{
  filters: NotificationFilter[];
}>;
export const CountProvider = (props: CountProviderProps) => {
  const novu = useNovu();
  const defaultFilterKey = createKey(DEFAULT_FILTER);
  const [unreadCounts, setUnreadCounts] = createSignal(new Map<string, number>());
  const [newNotificationCounts, setNewNotificationCounts] = createSignal(new Map<string, number>());

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: (data) => {
      setUnreadCounts((oldMap) => {
        const newMap = new Map(oldMap);
        newMap.set(defaultFilterKey, data.result);

        return newMap;
      });
    },
  });

  useNovuEvent({
    event: 'session.initialize.resolved',
    eventHandler: ({ data }) => {
      if (!data) {
        return;
      }

      setUnreadCounts((oldMap) => {
        const newMap = new Map(oldMap);
        newMap.set(defaultFilterKey, data.totalUnreadCount);

        return newMap;
      });
    },
  });

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async (data) => {
      const notification = data.result;
      for (let i = 0; i < props.filters.length; i++) {
        const filter = props.filters[i];
        const filterKey = createKey(filter);
        if (!areTagsEqual(filter.tags, notification.tags)) {
          continue;
        }

        setNewNotificationCounts((oldMap) => {
          const newMap = new Map(oldMap);
          newMap.set(filterKey, (oldMap.get(filterKey) || 0) + 1);

          return newMap;
        });
      }
    },
  });

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async () => {
      const data = (await novu.notifications.count({ filters: props.filters })).data;
      if (!data) {
        return;
      }

      setUnreadCounts((oldMap) => {
        const newMap = new Map(oldMap);
        for (let i = 0; i < props.filters.length; i++) {
          const filterKey = createKey(props.filters[i]);
          newMap.set(filterKey, data?.counts[i].count);
        }

        return newMap;
      });
    },
  });

  return (
    <CountContext.Provider value={{ unreadCounts, newNotificationCounts }}>{props.children}</CountContext.Provider>
  );
};

const createKey = (filter: NotificationFilter) => {
  //specify each property to preserver order
  return JSON.stringify({ tags: filter.tags, read: filter.read, archived: filter.archived });
};

export const useCount = (props: { filter: NotificationFilter }) => {
  const key = createMemo(() => createKey(props.filter));
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useCount must be used within a CountProvider');
  }

  const unreadCount = createMemo(() => context.unreadCounts().get(key()) || 0);
  const newNotificationCount = createMemo(() => context.newNotificationCounts().get(key()) || 0);

  return { unreadCount, newNotificationCount };
};
