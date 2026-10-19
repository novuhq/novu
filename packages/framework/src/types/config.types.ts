/**
 * A minimal logger interface used for all of the framework's internal logging
 * (workflow discovery, execution and bridge error reporting).
 *
 * The methods (`info`/`warn`/`error`) are chosen so that both the global
 * `console` and common structured loggers (pino, winston, ...) satisfy this
 * interface directly, with no adapter. The global `console` is the default;
 * provide your own to route Novu's internal logs wherever the rest of your
 * application logs go.
 */
export type Logger = {
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
};

export type ClientOptions = {
  /**
   * Use Novu Cloud US (https://api.novu.co) or EU deployment (https://eu.api.novu.co). Defaults to US.
   */
  apiUrl?: string;

  /**
   * Specify your Novu secret key, to secure the Bridge Endpoint, and Novu API communication.
   * Novu communicates securely with your endpoint using a signed HMAC header,
   * ensuring that only trusted requests from Novu are actioned by your Bridge API.
   * The secret key is used to sign the HMAC header.
   */
  secretKey?: string;

  /**
   * Explicitly use HMAC signature verification.
   * Setting this to `false` will enable Novu to communicate with your Bridge API
   * without requiring a valid HMAC signature.
   * This is useful for local development and testing.
   *
   * In production you must specify an `secretKey` and set this to `true`.
   *
   * Defaults to true.
   */
  strictAuthentication?: boolean;

  /**
   * Enable verbose logging for workflow discovery and execution.
   * When set to `false`, discovery and execution logs will be suppressed.
   * Defaults to `true` in development, `false` in production.
   */
  verbose?: boolean;

  /**
   * A custom logger used for all of the framework's internal logging
   * (workflow discovery, execution and bridge error reporting).
   *
   * Defaults to the global `console`. Provide your own logger to route Novu's
   * internal logs through your application's structured logger.
   *
   * Note: `verbose` still controls *whether* discovery and execution logs are
   * emitted; `logger` only controls *where* all logs are written. Bridge errors
   * (HTTP status >= 500) are always logged via this logger, regardless of
   * `verbose`.
   */
  logger?: Logger;
};
