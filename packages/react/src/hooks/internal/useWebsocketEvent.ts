import { EventHandler, Events, SocketEventNames } from '@novu/js';
import { useEffect } from 'react';
import { isWebLocksSupported, requestLock } from '../../utils/requestLock';
import { useNovu } from '../NovuProvider';
import { useBrowserTabsChannel } from './useBrowserTabsChannel';

export const useWebSocketEvent = <E extends SocketEventNames>({
  event: webSocketEvent,
  eventHandler: onMessage,
  enabled = true,
}: {
  event: E;
  eventHandler: (args: Events[E]) => void;
  enabled?: boolean;
}) => {
  const novu = useNovu();
  const channelName = `nv_ws_connection:a=${novu.applicationIdentifier}:s=${novu.subscriberId}:c=${novu.contextKey}:e=${webSocketEvent}`;

  const { postMessage } = useBrowserTabsChannel({
    channelName,
    onMessage,
    enabled,
  });

  // When Web Locks are unavailable, requestLock runs the callback in every tab,
  // so each tab already receives the event through its own socket. Re-broadcasting
  // in that case would duplicate the event across tabs (count multiplied by tab
  // count). Only the exclusive lock owner should fan out to the other tabs.
  const shouldBroadcast = isWebLocksSupported();
  const updateReadCount: EventHandler<Events[E]> = (data) => {
    onMessage(data);
    if (shouldBroadcast) {
      postMessage(data);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    let cleanup: () => void;
    const resolveLock = requestLock(channelName, () => {
      cleanup = novu.on(webSocketEvent, updateReadCount);
    });

    return () => {
      if (cleanup) {
        cleanup();
      }

      resolveLock();
    };
  }, [enabled]);
};
