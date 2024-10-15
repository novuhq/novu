import { onCleanup, onMount } from 'solid-js';
import type { SocketEventNames, EventHandler, Events } from '../../event-emitter';
import { useNovu } from '../context';
import { requestLock } from './browser';
import { useBrowserTabsChannel } from './useBrowserTabsChannel';

export const useWebSocketEvent = <E extends SocketEventNames>({
  event: webSocketEvent,
  eventHandler: onMessage,
}: {
  event: E;
  eventHandler: (args: Events[E]) => void;
}) => {
  const novu = useNovu();
  const { postMessage } = useBrowserTabsChannel({ channelName: `nv.${webSocketEvent}`, onMessage });

  const updateReadCount: EventHandler<Events[E]> = (data) => {
    onMessage(data);
    postMessage(data);
  };

  onMount(() => {
    let cleanup: () => void;
    const resolveLock = requestLock(`nv.${webSocketEvent}`, () => {
      cleanup = novu.on(webSocketEvent, updateReadCount);
    });

    onCleanup(() => {
      if (cleanup) {
        cleanup();
      }
      resolveLock();
    });
  });
};
