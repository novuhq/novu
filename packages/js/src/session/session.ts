import { NovuEventEmitter } from '../event-emitter';
import { InitializeSessionArgs } from './types';
import type { InboxService } from '../api';

export class Session {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #options: InitializeSessionArgs;

  constructor(
    options: InitializeSessionArgs,
    inboxServiceInstance: InboxService,
    eventEmitterInstance: NovuEventEmitter
  ) {
    this.#emitter = eventEmitterInstance;
    this.#inboxService = inboxServiceInstance;
    this.#options = options;
  }

  public get applicationIdentifier() {
    return this.#options.applicationIdentifier;
  }

  public get subscriberId() {
    return this.#options.subscriber?.subscriberId;
  }

  private handleApplicationIdentifier(method: 'get' | 'store' | 'delete', identifier?: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const key = 'novu_keyless_application_identifier';

    switch (method) {
      case 'get': {
        return window.localStorage.getItem(key);
      }

      case 'store': {
        if (identifier) {
          window.localStorage.setItem(key, identifier);
        }

        return null;
      }
      case 'delete': {
        window.localStorage.removeItem(key);

        return null;
      }
      default:
        return null;
    }
  }

  public async initialize(options?: InitializeSessionArgs): Promise<void> {
    try {
      if (options) {
        this.#options = options;
      }
      const { subscriber, subscriberHash, applicationIdentifier } = this.#options;

      let finalApplicationIdentifier = applicationIdentifier;
      if (!finalApplicationIdentifier) {
        const storedAppId = this.handleApplicationIdentifier('get');
        if (storedAppId) {
          finalApplicationIdentifier = storedAppId;
        }
      } else {
        this.handleApplicationIdentifier('delete');
      }
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      const response = await this.#inboxService.initializeSession({
        applicationIdentifier: finalApplicationIdentifier,
        subscriberHash,
        subscriber,
      });

      if (response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.handleApplicationIdentifier('store', response.applicationIdentifier);
      }

      if (!response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.handleApplicationIdentifier('delete');
      }

      this.#emitter.emit('session.initialize.resolved', { args: this.#options, data: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.resolved', { args: this.#options, error });
    }
  }
}
