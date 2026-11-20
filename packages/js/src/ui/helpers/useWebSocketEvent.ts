import type { Events, SocketEventNames } from '../../event-emitter';
import { useNovu } from '../context';
import { createWebSocketEventEffect } from '../core/stores/events';

export const useWebSocketEvent = <E extends SocketEventNames>({
  event,
  eventHandler,
}: {
  event: E;
  eventHandler: (args: Events[E]) => void;
}) => {
  createWebSocketEventEffect(useNovu(), event, eventHandler);
};
