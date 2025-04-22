import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type TopicEventType = 'deleted';

type TopicEventsContextType = {
  emitEvent: (event: TopicEventType, topicKey: string) => void;
  subscribeToEvent: (event: TopicEventType, handler: (topicKey: string) => void) => () => void;
};

const TopicEventsContext = createContext<TopicEventsContextType | undefined>(undefined);

export function TopicEventsProvider({ children }: { children: ReactNode }) {
  const [eventHandlers, setEventHandlers] = useState<Record<string, Array<(topicKey: string) => void>>>({});

  const emitEvent = useCallback(
    (event: TopicEventType, topicKey: string) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach((handler) => handler(topicKey));
    },
    [eventHandlers]
  );

  const subscribeToEvent = useCallback((event: TopicEventType, handler: (topicKey: string) => void) => {
    setEventHandlers((prevHandlers) => {
      const handlers = [...(prevHandlers[event] || []), handler];

      return {
        ...prevHandlers,
        [event]: handlers,
      };
    });

    return () => {
      setEventHandlers((prevHandlers) => {
        const handlers = prevHandlers[event] || [];
        const updatedHandlers = handlers.filter((h) => h !== handler);

        return {
          ...prevHandlers,
          [event]: updatedHandlers,
        };
      });
    };
  }, []);

  return <TopicEventsContext.Provider value={{ emitEvent, subscribeToEvent }}>{children}</TopicEventsContext.Provider>;
}

export function useTopicEvents() {
  const context = useContext(TopicEventsContext);

  if (!context) {
    throw new Error('useTopicEvents must be used within a TopicEventsProvider');
  }

  return context;
}
