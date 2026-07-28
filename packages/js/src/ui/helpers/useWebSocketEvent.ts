import { createEffect, onCleanup } from 'solid-js';
import type { EventHandler, Events, SocketEventNames } from '../../event-emitter';
import { useNovu } from '../context';
import { isWebLocksAvailable, requestLock } from './browser';

export const useWebSocketEvent = <E extends SocketEventNames>({
  event: webSocketEvent,
  eventHandler: onMessage,
}: {
  event: E;
  eventHandler: (args: Events[E]) => void;
}) => {
  const novuAccessor = useNovu();

  createEffect(() => {
    const currentNovu = novuAccessor();

    // Web Locks are only available in secure contexts. `http://localhost` is
    // treated as secure, but `http://my-app.test` is not — so the lock +
    // BroadcastChannel coordination below is skipped there.
    //
    // Without locks, every subscriber must listen via `novu.on` directly and
    // must NOT fan out through BroadcastChannel: each tab already has its own
    // socket, and BC would double-deliver the same event across tabs.
    if (!isWebLocksAvailable()) {
      const cleanup = currentNovu.on(webSocketEvent, onMessage);

      onCleanup(() => {
        cleanup();
      });

      return;
    }

    const channelName = `nv_ws_connection:a=${currentNovu.applicationIdentifier}:s=${currentNovu.subscriberId}:c=${currentNovu.contextKey}:e=${webSocketEvent}`;

    const tabsChannel = new BroadcastChannel(channelName);
    const listener = (event: MessageEvent<Events[E]>) => {
      onMessage(event.data);
    };

    tabsChannel.addEventListener('message', listener);

    const broadcastAndHandle: EventHandler<Events[E]> = (data) => {
      onMessage(data);
      tabsChannel.postMessage(data);
    };

    let cleanup: (() => void) | undefined;
    const resolveLock = requestLock(channelName, () => {
      cleanup = currentNovu.on(webSocketEvent, broadcastAndHandle);
    });

    onCleanup(() => {
      tabsChannel.removeEventListener('message', listener);
      tabsChannel.close();
      if (cleanup) {
        cleanup();
      }
      resolveLock();
    });
  });
};
