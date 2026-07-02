import { useEffect, useState } from 'react';

export const useBrowserTabsChannel = <T = unknown>({
  channelName,
  onMessage,
  enabled = true,
}: {
  channelName: string;
  onMessage: (args: T) => void;
  enabled?: boolean;
}) => {
  const [tabsChannel] = useState(
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : undefined
  );

  const postMessage = (data: T) => {
    if (!enabled) return;
    tabsChannel?.postMessage(data);
  };

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MessageEvent<T>) => {
      onMessage(event.data);
    };

    tabsChannel?.addEventListener('message', listener);

    return () => {
      tabsChannel?.removeEventListener('message', listener);
    };
  }, [enabled]);

  return { postMessage };
};
