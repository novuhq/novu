import type { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import type { Session as SessionData } from '../types';
import { isBrowser } from '../utils/is-browser';
import { InitializeSessionArgs } from './types';

export class Session {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #options: InitializeSessionArgs;
  #inFlight: Promise<boolean> | undefined;
  /** The latest token issued for the current subscriber and context. */
  #token: string | undefined;
  /** Every token issued for the current subscriber and context; cleared when either changes. */
  #tokens = new Set<string>();
  /** What the server returned for the current subscriber and context; cleared when either changes. */
  #data: SessionData | undefined;

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

  /**
   * The latest session the server returned for the current subscriber and context, or `undefined` until one has
   * resolved. Lets code that starts after `session.initialize.resolved` has fired read what it missed.
   */
  public get data(): SessionData | undefined {
    return this.#data;
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

    // Record the change right away, so a later change compares against it and the tokens of the old
    // subscriber or context stop counting as renewable.
    if (options) {
      this.#options = options;
      this.#tokens.clear();
      this.#data = undefined;
    }
    const requested = this.#options;

    // Let a request that is already running finish first, so its token cannot overwrite the new one.
    while (this.#inFlight) {
      await this.#inFlight;
    }

    // A newer change was made while this one waited; that one sends the request.
    if (requested !== this.#options) {
      return;
    }

    await this.#start(false);
  }

  /**
   * Asks the server for a new token for the current subscriber and context, for example after the old one expired.
   * Callers that ask while a session request is already running share that request.
   *
   * Pass `staleToken` (the token a failed request was sent with) to renew only that session: when it belonged to
   * a subscriber or context that has been replaced since, nothing is requested and the result is `false`.
   *
   * Resolves to `true` when the current token is newer than the stale one.
   */
  public refresh(staleToken?: string): Promise<boolean> {
    if (staleToken !== undefined) {
      if (!this.#tokens.has(staleToken)) {
        return Promise.resolve(false);
      }

      if (staleToken !== this.#token) {
        return Promise.resolve(true);
      }
    }

    return this.#inFlight ?? this.#start(true);
  }

  #start(renew: boolean): Promise<boolean> {
    const request = this.#requestSession(renew).finally(() => {
      this.#inFlight = undefined;
    });
    this.#inFlight = request;

    return request;
  }

  /**
   * With `renew`, only the subscriber's identity is sent: the profile fields given at start-up would otherwise
   * overwrite changes made on the server since then.
   */
  async #requestSession(renew: boolean): Promise<boolean> {
    const options = this.#options;
    try {
      const { subscriber, subscriberHash, contextHash, applicationIdentifier, defaultSchedule, context } = options;
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
      this.#emitter.emit('session.initialize.pending', { args: options });

      const response = await this.#inboxService.initializeSession({
        applicationIdentifier: finalApplicationIdentifier,
        subscriberHash,
        contextHash,
        subscriber: renew
          ? { subscriberId: subscriber?.subscriberId ?? '' }
          : {
              ...subscriber,
              subscriberId: subscriber?.subscriberId ?? '',
              timezone: subscriber?.timezone ?? currentTimezone,
            },
        defaultSchedule: renew ? undefined : defaultSchedule,
        context,
      });

      if (options === this.#options) {
        this.#token = response.token;
        this.#tokens.add(response.token);
        this.#data = response;
      }

      if (response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.handleApplicationIdentifier('store', response.applicationIdentifier);
      }

      if (!response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.handleApplicationIdentifier('delete');
      }

      this.#emitter.emit('session.initialize.resolved', { args: options, data: response });

      return true;
    } catch (error) {
      this.#emitter.emit('session.initialize.resolved', { args: options, error });

      return false;
    }
  }
}
