import { useEffect, useRef } from 'react';
import { useDataRef } from './useDataRef';

export const useBrowserTabsChannel = <T = unknown>({
  channelName,
  onMessage,
  enabled = true,
}: {
  channelName: string;
  onMessage: (args: T) => void;
  enabled?: boolean;
}) => {
  const tabsChannelRef = useRef<BroadcastChannel | undefined>(undefined);
  const onMessageRef = useDataRef(onMessage);

  // Follow channelName: when the provider swaps to another subscriber or context, events must go to that channel
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return;

    const tabsChannel = new BroadcastChannel(channelName);
    const listener = (event: MessageEvent<T>) => {
      onMessageRef.current(event.data);
    };

    tabsChannel.addEventListener('message', listener);
    tabsChannelRef.current = tabsChannel;

    return () => {
      tabsChannel.removeEventListener('message', listener);
      tabsChannel.close();
      if (tabsChannelRef.current === tabsChannel) {
        tabsChannelRef.current = undefined;
      }
    };
  }, [enabled, channelName]);

  const postMessage = (data: T) => {
    tabsChannelRef.current?.postMessage(data);
  };

  return { postMessage };
};
