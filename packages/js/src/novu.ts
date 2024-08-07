import { NovuEventEmitter } from './event-emitter';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { Notifications } from './notifications';
import { Session } from './session';
import { Preferences } from './preferences';
import { Socket } from './ws';
import { PRODUCTION_BACKEND_URL } from './utils/config';
import { InboxServiceSingleton } from './utils/inbox-service-singleton';
import type { NovuOptions } from './types';

export class Novu implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #session: Session;
  #socket: Socket;

  public readonly notifications: Notifications;
  public readonly preferences: Preferences;

  constructor(options: NovuOptions) {
    InboxServiceSingleton.getInstance({ backendUrl: options.backendUrl ?? PRODUCTION_BACKEND_URL });
    this.#emitter = NovuEventEmitter.getInstance({ recreate: true });
    this.#session = new Session({
      applicationIdentifier: options.applicationIdentifier,
      subscriberId: options.subscriberId,
      subscriberHash: options.subscriberHash,
    });
    this.#session.initialize();
    this.notifications = new Notifications({ useCache: options.useCache ?? true });
    this.preferences = new Preferences();
    this.#socket = new Socket({ socketUrl: options.socketUrl });
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    if (this.#socket.isSocketEvent(eventName)) {
      this.#socket.initialize();
    }
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.off(eventName, listener);
  }
}
