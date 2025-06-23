import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { SocketType } from '../types';
import type { BaseSocketInterface } from './base-socket';
import { PartySocketClient } from './party-socket';
import { Socket } from './socket';

export function createSocket({
  socketType = SocketType.SOCKET_IO,
  socketUrl,
  inboxServiceInstance,
  eventEmitterInstance,
}: {
  socketType?: SocketType;
  socketUrl?: string;
  inboxServiceInstance: InboxService;
  eventEmitterInstance: NovuEventEmitter;
}): BaseSocketInterface {
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
