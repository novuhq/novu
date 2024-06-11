import { NovuEventEmitter } from './event-emitter';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { Feeds } from './feeds';
import { Session } from './session';
import { Preferences } from './preferences';

interface NovuOptions {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
}

export class Novu implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #session: Session;

  public readonly feeds: Feeds;
  public readonly preferences: Preferences;

  constructor(options: NovuOptions) {
    this.#emitter = new NovuEventEmitter();
    this.#session = new Session(this.#emitter, {
      applicationIdentifier: options.applicationIdentifier,
      subscriberId: options.subscriberId,
      subscriberHash: options.subscriberHash,
    });
    this.#session.initialize();
    this.feeds = new Feeds(this.#emitter);
    this.preferences = new Preferences(this.#emitter);
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }
}
