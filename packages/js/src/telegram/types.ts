export type TelegramSubscriberLinkStatus = 'loading' | 'pending' | 'connected' | 'expired';

export type TelegramSubscriberLinkResponse = {
  deepLinkUrl: string;
  botUsername: string;
  expiresAt: string;
};

export type TelegramSubscriberLinkOptions = {
  /**
   * Base URL of the Novu API (or your backend proxy).
   * Defaults to `https://api.novu.co`.
   */
  apiUrl?: string;

  /**
   * Novu server-side secret key (`Authorization: ApiKey <key>`).
   * Required when calling the Novu API directly.
   * Omit when routing through a backend proxy that injects its own auth.
   */
  secretKey?: string;

  /** Integration identifier (the `identifier` field on the Telegram integration, not `_id`). */
  integrationIdentifier: string;

  /** External subscriber ID to link to the Telegram chat. */
  subscriberId: string;

  /**
   * Polling interval in milliseconds to check for connection confirmation.
   * Defaults to `2000` (2 seconds).
   */
  pollIntervalMs?: number;

  /**
   * Custom fetch function. Defaults to the global `fetch`.
   * Useful for injecting auth headers in a backend-proxy scenario.
   */
  fetchFn?: typeof fetch;
};

export type TelegramSubscriberLinkState = {
  status: TelegramSubscriberLinkStatus;
  deepLinkUrl: string | null;
  botUsername: string | null;
  expiresAt: string | null;
  error: Error | null;
};
