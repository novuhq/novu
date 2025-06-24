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
  if (!socketUrl || socketUrl === 'https://eu.socket.novu.co') {
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
