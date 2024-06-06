import { NovuEventEmitter } from './event-emitter';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { Feeds } from './feeds';
import { Session } from './session';
import { Preferences } from './preferences';
import { ApiServiceSingleton } from './utils/api-service-singleton';

const PRODUCTION_BACKEND_URL = 'https://api.novu.co';

type NovuOptions = {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
  backendUrl?: string;
};

export class Novu implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #session: Session;

  public readonly feeds: Feeds;
  public readonly preferences: Preferences;

  constructor(options: NovuOptions) {
    ApiServiceSingleton.getInstance({ backendUrl: options.backendUrl ?? PRODUCTION_BACKEND_URL });
    this.#emitter = NovuEventEmitter.getInstance({ recreate: true });
    this.#session = new Session({
      applicationIdentifier: options.applicationIdentifier,
      subscriberId: options.subscriberId,
      subscriberHash: options.subscriberHash,
    });
    this.#session.initialize();
    this.feeds = new Feeds();
    this.preferences = new Preferences();
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }
}
