import { EventHandler, Events, SocketEventNames } from '@novu/js';
import { useEffect } from 'react';
import { requestLock } from '../../utils/requestLock';
import { useNovu } from '../NovuProvider';
import { useBrowserTabsChannel } from './useBrowserTabsChannel';

export const useWebSocketEvent = <E extends SocketEventNames>({
  event: webSocketEvent,
  eventHandler: onMessage,
}: {
  event: E;
  eventHandler: (args: Events[E]) => void;
}) => {
  const novu = useNovu();
  const channelName = `nv_ws_connection:a=${novu.applicationIdentifier}:s=${novu.subscriberId}:e=${webSocketEvent}`;

  const { postMessage } = useBrowserTabsChannel({
    channelName,
    onMessage,
  });

  const updateReadCount: EventHandler<Events[E]> = (data) => {
    onMessage(data);
    postMessage(data);
  };

  useEffect(() => {
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
  }, []);
};
