import { EventHandler, Events, SocketEventNames } from '@novu/js';
import { useEffect } from 'react';
import { useNovu } from '../NovuProvider';
import { requestLock } from '../../utils/requestLock';
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

  useEffect(() => {
    let cleanup: () => void;
    const resolveLock = requestLock(`nv.${webSocketEvent}`, () => {
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
