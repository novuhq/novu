import { ApiService } from '@novu/client';

import { NovuEventEmitter } from './event-emitter';
import type { EventHandler, EventNames, Events } from './event-emitter';
import { Feeds } from './feeds';
import { Session } from './session';
import { Preferences } from './preferences';

const PRODUCTION_BACKEND_URL = 'https://api.novu.co';

interface NovuOptions {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash?: string;
  backendUrl?: string;
}

export class Novu implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #session: Session;
  #apiService: ApiService;

  public readonly feeds: Feeds;
  public readonly preferences: Preferences;

  constructor(options: NovuOptions) {
    this.#apiService = new ApiService(options.backendUrl ?? PRODUCTION_BACKEND_URL);
    this.#emitter = new NovuEventEmitter();
    this.#session = new Session(this.#emitter, this.#apiService, {
      applicationIdentifier: options.applicationIdentifier,
      subscriberId: options.subscriberId,
      subscriberHash: options.subscriberHash,
    });
    this.#session.initialize();
    this.feeds = new Feeds(this.#emitter, this.#apiService);
    this.preferences = new Preferences(this.#emitter, this.#apiService);
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }
}
