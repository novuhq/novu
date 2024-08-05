import { Accessor, createContext, createMemo, createSignal, ParentProps, useContext } from 'solid-js';
import { NotificationFilter } from '../../types';
import { areTagsEqual } from '../../utils/notification-utils';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { useWebSocketEvent } from '../helpers/useWebSocketEvent';
import { useInboxContext } from './InboxContext';
import { useNovu } from './NovuContext';

type CountContextValue = {
  totalUnreadCount: Accessor<number>;
  unreadCounts: Accessor<Map<string, number>>;
};

const CountContext = createContext<CountContextValue>(undefined);

export const CountProvider = (props: ParentProps) => {
  const novu = useNovu();
  const { tabs } = useInboxContext();
  const [totalUnreadCount, setTotalUnreadCount] = createSignal(0);
  const [unreadCounts, setUnreadCounts] = createSignal(new Map<string, number>());

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: (data) => setTotalUnreadCount(data.result),
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

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: async () => {
      const filters = tabs().map((tab) => ({ tags: tab.value, read: false, archived: false }));
      const { data } = await novu.notifications.count({ filters });
      if (!data) {
        return;
      }

      const newMap = new Map();
      const counts = data.counts;
      for (let i = 0; i < counts.length; i++) {
        const tagsKey = createKey(counts[i].filter.tags ?? []);
        newMap.set(tagsKey, data?.counts[i].count);
      }

      setUnreadCounts(newMap);
    },
  });

  return <CountContext.Provider value={{ totalUnreadCount, unreadCounts }}>{props.children}</CountContext.Provider>;
};

const createKey = (tags: string[]) => {
  return JSON.stringify({ tags: tags });
};

export const useTotalUnreadCount = () => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useCount must be used within a CountProvider');
  }

  return { totalUnreadCount: context.totalUnreadCount };
};

export const useUnreadCount = (props: { tags: string[] }) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error('useCount must be used within a CountProvider');
  }

  const key = createMemo(() => createKey(props.tags));
  const count = createMemo(() => context.unreadCounts().get(key()) || 0);

  return { count };
};
