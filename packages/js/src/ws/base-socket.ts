import type { SessionRefresher } from '../api';
import type { SocketEventNames } from '../event-emitter';
import type { Result } from '../types';

export interface BaseSocketInterface {
  isSocketEvent(eventName: string): eventName is SocketEventNames;
  connect(): Result<void>;
  disconnect(): Result<void>;
}

/** What a socket needs from the session: the socket server checks the token only when a connection opens. */
export type SocketSession = {
  /** Whether `token` must be renewed before a connection attempt; judged by the session's one expiry rule. */
  isExpired: (token: string | undefined) => boolean;
  refresh: SessionRefresher;
};
