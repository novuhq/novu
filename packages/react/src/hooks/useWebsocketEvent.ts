import { EventHandler, Events, SocketEventNames } from '@novu/js';
import { useEffect } from 'react';
import { useNovu } from '../components/NovuProvider';
import { requestLock } from '../utils/requestLock';
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
    const resolveLock = requestLock(`nv.${webSocketEvent}`, () => {
      novu.on(webSocketEvent, updateReadCount);
    });

    return () => {
      novu.off(webSocketEvent, updateReadCount);
      resolveLock();
    };
  }, []);
};
