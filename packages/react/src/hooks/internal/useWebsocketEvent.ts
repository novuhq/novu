import { EventHandler, Events, SocketEventNames } from '@novu/js';
import { useEffect } from 'react';
import { isWebLocksAvailable, requestLock } from '../../utils/requestLock';
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
  const useTabCoordination = isWebLocksAvailable();

  // BroadcastChannel is only safe when Web Locks coordinate a single socket
  // subscriber across tabs. On non-secure HTTP origins (e.g. http://my-app.test)
  // locks are unavailable, every tab has its own socket, and BC would
  // double-deliver events.
  const { postMessage } = useBrowserTabsChannel({
    channelName,
    onMessage,
    enabled: enabled && useTabCoordination,
  });

  const broadcastAndHandle: EventHandler<Events[E]> = (data) => {
    onMessage(data);
    postMessage(data);
  };

  useEffect(() => {
    if (!enabled) return;

    if (!useTabCoordination) {
      const cleanup = novu.on(webSocketEvent, onMessage);

      return () => {
        cleanup();
      };
    }

    let cleanup: (() => void) | undefined;
    const resolveLock = requestLock(channelName, () => {
      cleanup = novu.on(webSocketEvent, broadcastAndHandle);
    });

    return () => {
      if (cleanup) {
        cleanup();
      }

      resolveLock();
    };
    // Intentionally match prior dep surface: re-subscribe when enabled flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
};
