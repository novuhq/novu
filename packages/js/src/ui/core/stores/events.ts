import { Accessor, createEffect, onCleanup } from 'solid-js';
import type { EventHandler, EventNames, Events, SocketEventNames } from '../../../event-emitter';
import type { Novu } from '../../../novu';
import { isWebLocksSupported, requestLock } from '../browser';

/** Subscribes to a client event for as long as the owning reactive scope lives, following the current `Novu` instance. */
export const createNovuEventEffect = <E extends EventNames>(
  novu: Accessor<Novu>,
  event: E,
  eventHandler: EventHandler<Events[E]>
) => {
  createEffect(() => {
    const cleanup = novu().on(event, eventHandler);

    onCleanup(() => {
      cleanup();
    });
  });
};

/**
 * Subscribes to a websocket event once per browser, not once per tab: the tab holding the web lock listens and
 * fans the event out to the others over a `BroadcastChannel`.
 */
export const createWebSocketEventEffect = <E extends SocketEventNames>(
  novu: Accessor<Novu>,
  webSocketEvent: E,
  onMessage: (args: Events[E]) => void
) => {
  createEffect(() => {
    const currentNovu = novu();
    const channelName = `nv_ws_connection:a=${currentNovu.applicationIdentifier}:s=${currentNovu.subscriberId}:c=${currentNovu.contextKey}:e=${webSocketEvent}`;

    const tabsChannel = new BroadcastChannel(channelName);
    const listener = (event: MessageEvent<Events[E]>) => {
      onMessage(event.data);
    };

    tabsChannel.addEventListener('message', listener);

    // When Web Locks are unavailable, requestLock runs the callback in every tab,
    // so each tab already receives the event through its own socket. Re-broadcasting
    // in that case would duplicate the event across tabs (count multiplied by tab
    // count). Only the exclusive lock owner should fan out to the other tabs.
    const shouldBroadcast = isWebLocksSupported();
    const updateReadCount: EventHandler<Events[E]> = (data) => {
      onMessage(data);
      if (shouldBroadcast) {
        tabsChannel.postMessage(data);
      }
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
