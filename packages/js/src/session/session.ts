import type { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { isBrowser } from '../utils/is-browser';
import { InitializeSessionArgs } from './types';

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

  public get context() {
    return this.#options.context;
  }

  public get subscriberHash() {
    return this.#options.subscriberHash;
  }

  public get contextHash() {
    return this.#options.contextHash;
  }

  public get subscriber() {
    return this.#options.subscriber;
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
    const subscriberUnchanged = this.#options.subscriber?.subscriberId === options?.subscriber?.subscriberId;
    const contextUnchanged = JSON.stringify(this.#options.context) === JSON.stringify(options?.context);

    if (subscriberUnchanged && contextUnchanged) {
      return;
    }

    try {
      if (options) {
        this.#options = options;
      }
      const { subscriber, subscriberHash, contextHash, applicationIdentifier, defaultSchedule, context } =
        this.#options;
      let currentTimezone: string | undefined;
      if (isBrowser()) {
        currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

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
        contextHash,
        subscriber: {
          ...subscriber,
          subscriberId: subscriber?.subscriberId ?? '',
          timezone: subscriber?.timezone ?? currentTimezone,
        },
        defaultSchedule,
        context,
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
