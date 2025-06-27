import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { SocketType } from '../types';
import type { BaseSocketInterface } from './base-socket';
import { PartySocketClient, PRODUCTION_SOCKET_URL } from './party-socket';
import { Socket } from './socket';

const PARTY_SOCKET_URLS = [
  'wss://eu.socket.novu.co',
  PRODUCTION_SOCKET_URL,
  'wss://socket.novu-staging.co',
  'wss://socket-worker-local.cli-shortener.workers.dev',
];

const URL_TRANSFORMATIONS: Record<string, string> = {
  'https://eu.ws.novu.co': 'wss://eu.socket.novu.co',
  'https://ws.novu.co': PRODUCTION_SOCKET_URL,
  'https://dev.ws.novu.co': 'wss://socket.novu-staging.co',
};

function transformSocketUrl(socketUrl?: string): string {
  if (!socketUrl) return PRODUCTION_SOCKET_URL;

  return URL_TRANSFORMATIONS[socketUrl] || socketUrl;
}

function shouldUsePartySocket(socketUrl?: string): boolean {
  return !socketUrl || PARTY_SOCKET_URLS.includes(socketUrl);
}

export function createSocket({
  socketUrl,
  inboxServiceInstance,
  eventEmitterInstance,
}: {
  socketUrl?: string;
  inboxServiceInstance: InboxService;
  eventEmitterInstance: NovuEventEmitter;
}): BaseSocketInterface {
  const transformedSocketUrl = transformSocketUrl(socketUrl);
  const socketType = shouldUsePartySocket(transformedSocketUrl) ? SocketType.PARTY_SOCKET : SocketType.SOCKET_IO;

  switch (socketType) {
    case SocketType.PARTY_SOCKET:
      return new PartySocketClient({
        socketUrl: transformedSocketUrl,
        inboxServiceInstance,
        eventEmitterInstance,
      });
    case SocketType.SOCKET_IO:
    default:
      return new Socket({
        socketUrl: transformedSocketUrl,
        inboxServiceInstance,
        eventEmitterInstance,
      });
  }
}
