import type { InboxService } from '../api';
import { HttpError } from '../api/http-client';
import { NovuEventEmitter } from '../event-emitter';
import type { DefaultSchedule, Session as SessionResponse } from '../types';
import { buildContextKey } from '../utils/build-context-key';
import { NovuError } from '../utils/errors';
import { isBrowser } from '../utils/is-browser';
import { decodeJwtPayload, EXPIRY_SKEW_MS, getJwtExpiresAt, isJwtExpired } from '../utils/jwt';
import type { SessionIdentity, SubscriberIdentity, TokenIdentity } from './identity';
import type { InitializeSessionArgs } from './types';

/** What a token session's JWT says, decoded once when the session arrives. */
type TokenSessionClaims = {
  subscriberId: string | undefined;
  /** Server time minus browser time, from the session's `iat`, so expiry is judged on the server's clock. */
  clockOffsetMs: number;
  /**
   * How long before `exp` the token counts as expired. The skew normally; zero for a lifetime under the skew, which
   * would otherwise be renewed for every request. `undefined` when the token looked expired on arrival (a clock the
   * offset could not correct): it is never renewed early, only after the server rejects it.
   */
  renewalSkewMs: number | undefined;
};

export class Session {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #identity: SessionIdentity;
  #defaultSchedule: DefaultSchedule | undefined;
  #initialToken: string | undefined;
  #inFlight: Promise<boolean> | undefined;
  /** What the server returned for the current subscriber and context; cleared when either changes. */
  #session: SessionResponse | undefined;
  #claims: TokenSessionClaims | undefined;
  /** Every token issued for the current subscriber and context; cleared when either changes. */
  #tokens = new Set<string>();
  /** Who the client was last signed in as; kept across `changeIdentity`, so a switch is noticed when it resolves. */
  #signedInAs: { subscriberId: string | undefined; contextKey: string } | undefined;
  #error: unknown;
  #onSubscriberChange: () => void;

  constructor(
    {
      identity,
      defaultSchedule,
      onSubscriberChange,
    }: {
      identity: SessionIdentity;
      defaultSchedule?: DefaultSchedule;
      /**
       * Called when a session signed in another subscriber or context than the one before it, whether through
       * `changeIdentity` or a renewal, before `session.initialize.resolved` reaches any listener.
       */
      onSubscriberChange: () => void;
    },
    inboxServiceInstance: InboxService,
    eventEmitterInstance: NovuEventEmitter
  ) {
    this.#emitter = eventEmitterInstance;
    this.#inboxService = inboxServiceInstance;
    this.#identity = identity;
    this.#defaultSchedule = defaultSchedule;
    this.#onSubscriberChange = onSubscriberChange;
    this.#initialToken = identity.kind === 'token' ? identity.initialToken : undefined;
  }

  public get applicationIdentifier() {
    return this.#identity.applicationIdentifier;
  }

  public get subscriberId(): string | undefined {
    if (this.#identity.kind === 'subscriber') {
      return this.#identity.subscriber.subscriberId;
    }

    return this.#claims?.subscriberId;
  }

  public get contextKey(): string {
    if (this.#identity.kind === 'subscriber') {
      return buildContextKey(this.#identity.context);
    }

    return [...(this.#session?.contextKeys ?? [])].sort().join(',');
  }

  public get context() {
    return this.#identity.kind === 'subscriber' ? this.#identity.context : undefined;
  }

  public get contextHash() {
    return this.#identity.kind === 'subscriber' ? this.#identity.contextHash : undefined;
  }

  public get subscriberHash() {
    return this.#identity.kind === 'subscriber' ? this.#identity.subscriberHash : undefined;
  }

  public get subscriber() {
    return this.#identity.kind === 'subscriber' ? this.#identity.subscriber : undefined;
  }

  /**
   * The latest session the server returned for the current subscriber and context, or `undefined` until one has
   * resolved. Lets code that starts after `session.initialize.resolved` has fired read what it missed.
   */
  public get data(): SessionResponse | undefined {
    return this.#session;
  }

  /** Why the latest session request failed, or `undefined` once one succeeded. Read it the same way as `data`. */
  public get error(): unknown {
    return this.#error;
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

  public start(): void {
    void this.#start(false);
  }

  public async changeIdentity(change: (current: SubscriberIdentity) => SubscriberIdentity): Promise<void> {
    const current = this.#identity;
    if (current.kind !== 'subscriber') {
      throw new NovuError(
        'Changing the subscriber or context is not supported with a token source; the token decides the subscriber',
        undefined
      );
    }
    const identity = change(current);

    const subscriberUnchanged = current.subscriber.subscriberId === identity.subscriber.subscriberId;
    const contextUnchanged = JSON.stringify(current.context) === JSON.stringify(identity.context);
    if (subscriberUnchanged && contextUnchanged) {
      return;
    }

    // Record the change right away, so a later change compares against it and the tokens of the old
    // subscriber or context stop counting as renewable.
    this.#identity = identity;
    this.#tokens.clear();
    this.#session = undefined;
    this.#error = undefined;

    // Let a request that is already running finish first, so its token cannot overwrite the new one.
    while (this.#inFlight) {
      await this.#inFlight;
    }

    // A newer change was made while this one waited; that one sends the request.
    if (identity !== this.#identity) {
      return;
    }

    await this.#start(false);
  }

  /**
   * Called before every request except the session request. Resolves to the token to send it with: the latest one
   * for the subscriber and context `currentToken` belongs to, renewed first when it is about to expire. Rejects with
   * a `NovuError` when the request must not go out: `currentToken` belongs to a subscriber or context that has been
   * replaced, or the renewal failed or signed in someone else, so the request would run as the wrong subscriber.
   *
   * Only a token source renews here (see `isExpired`); a subscriber session renews after a 401.
   */
  public async tokenForRequest(currentToken: string | undefined): Promise<string | undefined> {
    if (this.#identity.kind !== 'token' || currentToken === undefined) {
      return currentToken;
    }
    // A session request in flight may be about to record `currentToken`, or to replace the subscriber it belongs to.
    while (this.#inFlight) {
      await this.#inFlight;
    }
    const session = this.#session;
    if (session && this.#tokens.has(currentToken)) {
      if (!this.isExpired(session.token)) {
        return session.token;
      }
      if ((await this.refresh(session.token)) && this.#session) {
        return this.#session.token;
      }
    }

    throw new NovuError(
      'The session could not be renewed for the same subscriber, so the request was not sent',
      undefined
    );
  }

  /**
   * Whether `token` must be renewed before it is sent. The one expiry rule for requests and sockets.
   * - A subscriber session judges it on the browser clock, a little before the real expiry.
   * - A token source judges it on the server's clock, so a browser clock that is off neither keeps an expired token
   *   nor renews a fresh one (see `renewalSkewMs` for short tokens).
   */
  public isExpired(token: string | undefined): boolean {
    const claims = this.#claims;
    if (this.#identity.kind === 'subscriber' || !claims) {
      return isJwtExpired(token);
    }
    const expiresAt = getJwtExpiresAt(token);
    if (expiresAt === undefined || claims.renewalSkewMs === undefined) {
      return false;
    }

    return Date.now() + claims.clockOffsetMs >= expiresAt - claims.renewalSkewMs;
  }

  /** Whether `token` was issued for the current subscriber and context. */
  public isCurrentToken(token: string): boolean {
    return this.#tokens.has(token);
  }

  /**
   * Asks the server for a new token for the current subscriber and context, for example after the old one expired.
   * Callers that ask while a session request is already running share that request.
   *
   * Pass `staleToken` (the token a failed request was sent with) to renew only that session:
   * - a token of a subscriber or context that has been replaced since → nothing is requested, `false`;
   * - a token older than the current one → nothing is requested, `true` (someone else already renewed it);
   * - the current token of a subscriber session that has not expired → `false`: the 401 has another cause, and a
   *   new token would not fix it;
   * - otherwise the session is renewed. A token source always renews: its 401 can come from clock skew.
   *
   * Resolves to `true` when the current token is newer than the stale one and belongs to the same subscriber and
   * context. A renewal that signs in someone else resolves to `false`, so the request is not resent as them.
   */
  public refresh(staleToken?: string): Promise<boolean> {
    if (staleToken !== undefined) {
      if (!this.#tokens.has(staleToken)) {
        return Promise.resolve(false);
      }

      if (staleToken !== this.#session?.token) {
        return Promise.resolve(true);
      }

      if (this.#identity.kind === 'subscriber' && !isJwtExpired(staleToken)) {
        return Promise.resolve(false);
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

  async #requestSession(renew: boolean): Promise<boolean> {
    const identity = this.#identity;
    const args = this.#eventArgs(identity);
    try {
      this.#emitter.emit('session.initialize.pending', { args });

      const response =
        identity.kind === 'token'
          ? await this.#exchangeLoginToken(identity, renew)
          : await this.#initializeSubscriberSession(identity, renew);

      let subscriberChanged = false;
      if (identity === this.#identity) {
        this.#session = response;
        this.#claims = identity.kind === 'token' ? this.#readClaims(response.token) : undefined;
        /*
         * A token source can sign in someone else on renewal (a logout and login in the same tab). The old
         * tokens then belong to the previous subscriber: a request sent with one must not be resent as the new one.
         */
        subscriberChanged = this.#recordSignedIn();
        if (subscriberChanged) {
          this.#tokens.clear();
        }
        this.#tokens.add(response.token);
        this.#error = undefined;
      }

      if (response?.applicationIdentifier?.startsWith('pk_keyless_')) {
        this.handleApplicationIdentifier('store', response.applicationIdentifier);
      } else {
        this.handleApplicationIdentifier('delete');
      }

      // Listeners of the new subscriber must not find the previous one's data.
      if (subscriberChanged) {
        this.#onSubscriberChange();
      }
      this.#emitter.emit('session.initialize.resolved', { args, data: response });

      return identity === this.#identity && !subscriberChanged;
    } catch (error) {
      if (identity === this.#identity) {
        this.#error = error;
        // A subscriber identity is known without a session, so the previous one's data goes even when this failed.
        if (identity.kind === 'subscriber' && this.#recordSignedIn()) {
          this.#onSubscriberChange();
        }
      }
      this.#emitter.emit('session.initialize.resolved', { args, error });

      return false;
    }
  }

  /** Records who the client is now signed in as; true when that differs from who it was signed in as before. */
  #recordSignedIn(): boolean {
    const previous = this.#signedInAs;
    const current = { subscriberId: this.subscriberId, contextKey: this.contextKey };
    this.#signedInAs = current;

    return (
      previous !== undefined &&
      (previous.subscriberId !== current.subscriberId || previous.contextKey !== current.contextKey)
    );
  }

  #readClaims(token: string): TokenSessionClaims {
    const payload = decodeJwtPayload(token);
    const issuedAt = payload?.iat;
    const expiresAt = getJwtExpiresAt(token) ?? Number.POSITIVE_INFINITY;
    const clockOffsetMs = typeof issuedAt === 'number' ? issuedAt * 1000 - Date.now() : 0;
    const serverNow = Date.now() + clockOffsetMs;
    let renewalSkewMs: number | undefined;
    if (serverNow < expiresAt - EXPIRY_SKEW_MS) {
      renewalSkewMs = EXPIRY_SKEW_MS;
    } else if (serverNow < expiresAt) {
      renewalSkewMs = 0;
    }

    return {
      subscriberId: typeof payload?.subscriberId === 'string' ? payload.subscriberId : undefined,
      clockOffsetMs,
      renewalSkewMs,
    };
  }

  #eventArgs(identity: SessionIdentity): InitializeSessionArgs {
    const defaultSchedule = this.#defaultSchedule;
    if (identity.kind === 'token') {
      return { applicationIdentifier: identity.applicationIdentifier, defaultSchedule };
    }
    const { kind: _, ...subscriberArgs } = identity;

    return { ...subscriberArgs, defaultSchedule };
  }

  /**
   * With `renew`, only the subscriber's identity is sent: the profile fields given at start-up would otherwise
   * overwrite changes made on the server since then.
   */
  async #initializeSubscriberSession(identity: SubscriberIdentity, renew: boolean): Promise<SessionResponse> {
    const { subscriber, subscriberHash, contextHash, applicationIdentifier, context } = identity;
    const currentTimezone = isBrowser() ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    let finalApplicationIdentifier = applicationIdentifier;
    if (finalApplicationIdentifier) {
      this.handleApplicationIdentifier('delete');
    } else {
      finalApplicationIdentifier = this.handleApplicationIdentifier('get') ?? '';
    }

    return this.#inboxService.initializeSession({
      applicationIdentifier: finalApplicationIdentifier,
      subscriberHash,
      contextHash,
      subscriber: renew
        ? { subscriberId: subscriber.subscriberId }
        : { ...subscriber, timezone: subscriber.timezone ?? currentTimezone },
      defaultSchedule: renew ? undefined : this.#defaultSchedule,
      context,
    });
  }

  async #exchangeLoginToken(identity: TokenIdentity, renew: boolean): Promise<SessionResponse> {
    const exchange = (subscriberToken: string) =>
      this.#inboxService.initializeSession({
        applicationIdentifier: identity.applicationIdentifier,
        subscriberToken,
        defaultSchedule: renew ? undefined : this.#defaultSchedule,
      });

    const initialToken = this.#initialToken;
    this.#initialToken = undefined;
    if (initialToken && !isJwtExpired(initialToken)) {
      try {
        return await exchange(initialToken);
      } catch (error) {
        // An expired (401) or otherwise rejected (400, e.g. a rotated signing key) server-rendered token is replaced.
        if (!(error instanceof HttpError) || error.status < 400 || error.status >= 500) {
          throw error;
        }
      }
    }

    return exchange(await identity.getToken({}));
  }
}
