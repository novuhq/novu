import type {
  TelegramSubscriberLinkOptions,
  TelegramSubscriberLinkResponse,
  TelegramSubscriberLinkState,
} from './types';

const DEFAULT_API_URL = 'https://api.novu.co';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const TELEGRAM_PROVIDER_ID = 'telegram';

type StateListener = (state: TelegramSubscriberLinkState) => void;

type LinkChannelEndpointApiResponse = {
  url: string;
  providerMetadata?: {
    botUsername?: string;
    expiresAt?: string;
  };
};

/**
 * Framework-agnostic helper that manages the full Telegram subscriber-link
 * lifecycle: issue a deep link, poll for the subscriber's `/start` tap, and
 * re-issue automatically when the 10-minute code expires.
 *
 * **Important:** The subscriber-link endpoint requires `INTEGRATION_WRITE`
 * permission and must be called from a trusted server or via a backend proxy —
 * never directly from an untrusted browser with end-user credentials.
 *
 * @example
 * ```ts
 * import { TelegramSubscriberLink } from '@novu/js';
 *
 * const link = new TelegramSubscriberLink({
 *   secretKey: process.env.NOVU_SECRET_KEY,
 *   integrationIdentifier: '<telegram-integration-identifier>',
 *   subscriberId: 'user-42',
 * });
 *
 * link.onStateChange((state) => {
 *   console.log(state.status, state.deepLinkUrl);
 * });
 *
 * await link.start();
 * // … later …
 * link.stop();
 * ```
 */
export class TelegramSubscriberLink {
  readonly #options: Required<
    Pick<TelegramSubscriberLinkOptions, 'apiUrl' | 'integrationIdentifier' | 'subscriberId' | 'pollIntervalMs'>
  > & { secretKey?: string; fetchFn: typeof fetch };

  #state: TelegramSubscriberLinkState = {
    status: 'loading',
    deepLinkUrl: null,
    botUsername: null,
    expiresAt: null,
    error: null,
  };

  #listeners: Set<StateListener> = new Set();
  #pollTimer: ReturnType<typeof setTimeout> | null = null;
  #expiryTimer: ReturnType<typeof setTimeout> | null = null;
  #stopped = false;
  // Bumped on every (re)issue so timers/callbacks captured by a previous link
  // become stale and bail out — prevents overlapping poll loops after a
  // refresh() or expiry re-issue.
  #generation = 0;

  constructor(options: TelegramSubscriberLinkOptions) {
    this.#options = {
      apiUrl: options.apiUrl ?? DEFAULT_API_URL,
      secretKey: options.secretKey,
      integrationIdentifier: options.integrationIdentifier,
      subscriberId: options.subscriberId,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      fetchFn: options.fetchFn ?? fetch,
    };
  }

  get state(): Readonly<TelegramSubscriberLinkState> {
    return this.#state;
  }

  onStateChange(listener: StateListener): () => void {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Check whether the subscriber is already connected; if not, issue a deep
   * link and begin polling for connection. Call {@link stop} to cancel polling
   * and timers.
   */
  async start(): Promise<void> {
    this.#stopped = false;
    const generation = ++this.#generation;

    try {
      const connected = await this.#checkConnection();
      if (this.#isStale(generation)) return;

      if (connected) {
        this.#setState({ ...this.#state, status: 'connected', error: null });

        return;
      }
    } catch {
      // fall through to issuing a link
    }

    if (this.#isStale(generation)) return;

    await this.#issueAndPoll();
  }

  /** Re-issue a fresh deep link (e.g. after expiry or on-demand refresh). */
  async refresh(): Promise<void> {
    this.#clearTimers();
    this.#stopped = false;
    await this.#issueAndPoll();
  }

  /** Stop all polling and expiry timers. */
  stop(): void {
    this.#stopped = true;
    this.#clearTimers();
  }

  async #issueAndPoll(): Promise<void> {
    const generation = ++this.#generation;

    try {
      const response = await this.#issueSubscriberLink();

      if (this.#isStale(generation)) return;

      this.#setState({
        status: 'pending',
        deepLinkUrl: response.deepLinkUrl,
        botUsername: response.botUsername,
        expiresAt: response.expiresAt,
        error: null,
      });

      this.#scheduleExpiry(response.expiresAt, generation);
      this.#startPolling(generation);
    } catch (err) {
      if (this.#isStale(generation)) return;

      this.#setState({
        ...this.#state,
        status: 'pending',
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  #isStale(generation: number): boolean {
    return this.#stopped || generation !== this.#generation;
  }

  async #issueSubscriberLink(): Promise<TelegramSubscriberLinkResponse> {
    const { apiUrl, integrationIdentifier, subscriberId, secretKey, fetchFn } = this.#options;

    const url = `${apiUrl}/v1/integrations/channel-endpoints/link`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secretKey) {
      headers.Authorization = `ApiKey ${secretKey}`;
    }

    const res = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ integrationIdentifier, subscriberId }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to issue Telegram subscriber link (HTTP ${res.status}): ${body}`);
    }

    const json = await res.json();
    const payload = (json.data ?? json) as LinkChannelEndpointApiResponse;

    return {
      deepLinkUrl: payload.url,
      botUsername: payload.providerMetadata?.botUsername ?? '',
      expiresAt: payload.providerMetadata?.expiresAt ?? '',
    };
  }

  #scheduleExpiry(expiresAt: string, generation: number): void {
    const expiresTs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresTs)) {
      this.#setState({
        ...this.#state,
        error: new Error(`Invalid expiresAt received: ${expiresAt}`),
      });

      return;
    }

    const msUntilExpiry = expiresTs - Date.now();
    if (msUntilExpiry <= 0) {
      this.#handleExpiry(generation);

      return;
    }

    this.#expiryTimer = setTimeout(() => this.#handleExpiry(generation), msUntilExpiry);
  }

  #handleExpiry(generation: number): void {
    if (this.#isStale(generation)) return;

    this.#clearTimers();

    this.#setState({
      ...this.#state,
      status: 'expired',
    });

    void this.#issueAndPoll();
  }

  #startPolling(generation: number): void {
    if (this.#isStale(generation)) return;

    const poll = async () => {
      if (this.#isStale(generation)) return;

      try {
        const connected = await this.#checkConnection();
        if (this.#isStale(generation)) return;

        if (connected) {
          this.#clearTimers();
          this.#setState({ ...this.#state, status: 'connected', error: null });

          return;
        }
      } catch {
        // transient — keep polling
      }

      if (!this.#isStale(generation)) {
        this.#pollTimer = setTimeout(poll, this.#options.pollIntervalMs);
      }
    };

    this.#pollTimer = setTimeout(poll, this.#options.pollIntervalMs);
  }

  async #checkConnection(): Promise<boolean> {
    const { apiUrl, integrationIdentifier, subscriberId, secretKey, fetchFn } = this.#options;

    const params = new URLSearchParams({
      subscriberId,
      integrationIdentifier,
      providerId: TELEGRAM_PROVIDER_ID,
      limit: '1',
    });
    const url = `${apiUrl}/v1/channel-endpoints?${params.toString()}`;

    const headers: Record<string, string> = {};
    if (secretKey) {
      headers.Authorization = `ApiKey ${secretKey}`;
    }

    const res = await fetchFn(url, { method: 'GET', headers });

    if (!res.ok) return false;

    const json = await res.json();
    const endpoints: unknown[] = json.data ?? json;

    return Array.isArray(endpoints) && endpoints.length > 0;
  }

  #setState(next: TelegramSubscriberLinkState): void {
    this.#state = next;
    for (const listener of this.#listeners) {
      listener(next);
    }
  }

  #clearTimers(): void {
    if (this.#pollTimer) {
      clearTimeout(this.#pollTimer);
      this.#pollTimer = null;
    }
    if (this.#expiryTimer) {
      clearTimeout(this.#expiryTimer);
      this.#expiryTimer = null;
    }
  }
}
