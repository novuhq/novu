import type { EventHandler, EventNames, Events } from './event-emitter';
import { NovuEventEmitter } from './event-emitter';
import { Notifications } from './notifications';
import { Preferences } from './preferences';
import { Session } from './session';
import type { NovuOptions } from './types';
import { PRODUCTION_BACKEND_URL } from './utils/config';
import { InboxServiceSingleton } from './utils/inbox-service-singleton';
import { Socket } from './ws';

export class Novu implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #session: Session;

  public readonly notifications: Notifications;
  public readonly preferences: Preferences;
  public on: <Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>) => void;
  public off: <Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>) => void;

  constructor(options: NovuOptions) {
    InboxServiceSingleton.getInstance({ backendUrl: options.backendUrl ?? PRODUCTION_BACKEND_URL });
    const emitter = NovuEventEmitter.getInstance({ recreate: true });
    this.#session = new Session({
      applicationIdentifier: options.applicationIdentifier,
      subscriberId: options.subscriberId,
      subscriberHash: options.subscriberHash,
    });
    this.#session.initialize();
    this.notifications = new Notifications({ useCache: options.useCache ?? true });
    this.preferences = new Preferences({ useCache: options.useCache ?? true });
    const socket = new Socket({ socketUrl: options.socketUrl });
    this.on = (eventName, listener) => {
      if (socket.isSocketEvent(eventName)) {
        socket.initialize();
      }
      emitter.on(eventName, listener);
    };

    this.off = (eventName, listener) => {
      emitter.off(eventName, listener);
    };
  }
}
