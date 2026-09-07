import type { SocketEventNames } from '../event-emitter';
import type { Result } from '../types';

export interface BaseSocketInterface {
  isSocketEvent(eventName: string): eventName is SocketEventNames;
  connect(): Result<void>;
  disconnect(): Result<void>;
}
