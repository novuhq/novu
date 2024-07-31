import { createContext, useContext, createSignal, Accessor, ParentProps } from 'solid-js';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { useWebSocketEvent } from '../helpers/useWebSocketEvent';

type UnreadCountContextValue = {
  unreadCount: Accessor<number>;
};

const UnreadCountContext = createContext<UnreadCountContextValue>(undefined);

export const UnreadCountProvider = (props: ParentProps) => {
  const [unreadCount, setUnreadCount] = createSignal(0);
  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: (data) => setUnreadCount(data.result),
  });
  useNovuEvent({
    event: 'session.initialize.resolved',
    eventHandler: ({ data }) => {
      if (!data) {
        return;
      }

      setUnreadCount(data.totalUnreadCount);
    },
  });

  return <UnreadCountContext.Provider value={{ unreadCount }}>{props.children}</UnreadCountContext.Provider>;
};

export function useUnreadCount() {
  const context = useContext(UnreadCountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within a UnreadCountProvider');
  }

  return context;
}
