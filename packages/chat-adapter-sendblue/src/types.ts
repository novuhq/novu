export interface SendblueAdapterConfig {
  /** Sendblue API key id (`sb-api-key-id` header). */
  apiKey: string;
  /** Sendblue API secret key (`sb-api-secret-key` header). */
  secretKey: string;
  /** E.164 number the agent sends from (`from_number` on send-message). */
  fromNumber: string;
  /**
   * Shared secret Sendblue echoes back in the `sb-signing-secret` header on
   * inbound `receive` webhooks. Requests without a matching secret are
   * rejected — the adapter fails closed.
   */
  webhookSecret: string;
  /** Bot display name. Defaults to `sendblue-agent`. */
  userName?: string;
}
