import { NovuEventEmitter } from '../event-emitter';
import { InitializeSessionArgs } from './types';
import type { InboxService } from '../api';

const NOVU_APP_ID_KEY = 'novu_keyless_application_identifier';

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
    if ('applicationIdentifier' in this.#options) {
      return this.#options.applicationIdentifier;
    }

    return undefined;
  }

  public get subscriberId() {
    if ('subscriber' in this.#options && this.#options.subscriber) {
      return this.#options.subscriber.subscriberId;
    }

    return undefined;
  }

  private getStoredApplicationIdentifier(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(NOVU_APP_ID_KEY);
    }

    return null;
  }

  private storeApplicationIdentifier(identifier: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(NOVU_APP_ID_KEY, identifier);
    }
  }

  public async initialize(): Promise<void> {
    try {
      const subscriber = 'subscriber' in this.#options ? this.#options.subscriber : undefined;
      const subscriberHash = 'subscriberHash' in this.#options ? this.#options.subscriberHash : undefined;
      const applicationIdentifier =
        'applicationIdentifier' in this.#options ? this.#options.applicationIdentifier : undefined;

      let finalApplicationIdentifier = applicationIdentifier;
      if (!finalApplicationIdentifier) {
        const storedAppId = this.getStoredApplicationIdentifier();
        if (storedAppId) {
          finalApplicationIdentifier = storedAppId;
        }
      } else {
        this.storeApplicationIdentifier('');
      }
      this.#emitter.emit('session.initialize.pending', { args: this.#options });

      const response = await this.#inboxService.initializeSession({
        applicationIdentifier: finalApplicationIdentifier,
        subscriberHash,
        subscriber,
      });

      // Check if the response's applicationIdentifier starts with pk_keyless_
      if (response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.storeApplicationIdentifier(response.applicationIdentifier);
      }

      this.#emitter.emit('session.initialize.resolved', { args: this.#options, data: response });
    } catch (error) {
      this.#emitter.emit('session.initialize.resolved', { args: this.#options, error });
    }
  }
}
