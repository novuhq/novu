import { createEffect, onCleanup } from 'solid-js';
import type { EventHandler, Events, SocketEventNames } from '../../event-emitter';
import { useNovu } from '../context';
import { requestLock } from './browser';

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
    const channelName = `nv_ws_connection:a=${currentNovu.applicationIdentifier}:s=${currentNovu.subscriberId}:c=${currentNovu.contextKey}:e=${webSocketEvent}`;

    const tabsChannel = new BroadcastChannel(channelName);
    const listener = (event: MessageEvent<Events[E]>) => {
      onMessage(event.data);
    };

    tabsChannel.addEventListener('message', listener);

    const updateReadCount: EventHandler<Events[E]> = (data) => {
      onMessage(data);
      tabsChannel.postMessage(data);
    };

    let cleanup: (() => void) | undefined;
    const resolveLock = requestLock(channelName, () => {
      cleanup = currentNovu.on(webSocketEvent, updateReadCount);
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
