import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { SocketType } from '../types';
import type { BaseSocketInterface } from './base-socket';
import { PartySocketClient } from './party-socket';
import { Socket } from './socket';

export function createSocket({
  socketUrl,
  inboxServiceInstance,
  eventEmitterInstance,
}: {
  socketUrl?: string;
  inboxServiceInstance: InboxService;
  eventEmitterInstance: NovuEventEmitter;
}): BaseSocketInterface {
  let socketType = SocketType.SOCKET_IO;
  if (
    !socketUrl ||
    socketUrl === 'wss://eu.socket.novu.co' ||
    socketUrl === 'https://eu.ws.novu.co' ||
    socketUrl === 'wss://socket.novu.co' ||
    socketUrl === 'wss://socket.novu-staging.co' ||
    socketUrl === 'https://dev.ws.novu.co' ||
    socketUrl === 'wss://socket-worker-local.cli-shortener.workers.dev'
  ) {
    socketType = SocketType.PARTY_SOCKET;
  }

  switch (socketType) {
    case SocketType.PARTY_SOCKET:
      return new PartySocketClient({
        socketUrl,
        inboxServiceInstance,
        eventEmitterInstance,
      });
    case SocketType.SOCKET_IO:
    default:
      return new Socket({
        socketUrl,
        inboxServiceInstance,
        eventEmitterInstance,
      });
  }
}
