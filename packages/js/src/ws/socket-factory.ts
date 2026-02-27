import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { NovuSocketOptions, SocketTypeOption } from '../types';
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

const SOCKET_TYPE_OPTION_MAP: Record<SocketTypeOption, SocketType> = {
  cloud: SocketType.PARTY_SOCKET,
  'self-hosted': SocketType.SOCKET_IO,
};

function transformSocketUrl(socketUrl?: string): string {
  if (!socketUrl) return PRODUCTION_SOCKET_URL;

  return URL_TRANSFORMATIONS[socketUrl] || socketUrl;
}

function shouldUsePartySocket(socketUrl?: string): boolean {
  return !socketUrl || PARTY_SOCKET_URLS.includes(socketUrl);
}

function resolveSocketType(socketUrl?: string, explicitType?: SocketTypeOption): SocketType {
  if (explicitType) {
    return SOCKET_TYPE_OPTION_MAP[explicitType];
  }

  return shouldUsePartySocket(socketUrl) ? SocketType.PARTY_SOCKET : SocketType.SOCKET_IO;
}

export function createSocket({
  socketUrl,
  socketOptions,
  inboxServiceInstance,
  eventEmitterInstance,
}: {
  socketUrl?: string;
  socketOptions?: NovuSocketOptions;
  inboxServiceInstance: InboxService;
  eventEmitterInstance: NovuEventEmitter;
}): BaseSocketInterface {
  const transformedSocketUrl = transformSocketUrl(socketUrl);
  const { socketType: explicitSocketType, ...restSocketOptions } = socketOptions || {};
  const socketType = resolveSocketType(transformedSocketUrl, explicitSocketType);

  switch (socketType) {
    case SocketType.PARTY_SOCKET:
      return new PartySocketClient({
        socketUrl: transformedSocketUrl,
        socketOptions: restSocketOptions,
        inboxServiceInstance,
        eventEmitterInstance,
      });
    case SocketType.SOCKET_IO:
    default:
      return new Socket({
        socketUrl: transformedSocketUrl,
        socketOptions: restSocketOptions,
        inboxServiceInstance,
        eventEmitterInstance,
      });
  }
}
