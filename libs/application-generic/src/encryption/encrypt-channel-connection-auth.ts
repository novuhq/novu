import { decryptApiKey, encryptApiKey } from './encrypt-provider';

/**
 * Fields inside a `ChannelConnection.auth` object that must be encrypted at rest.
 *
 * Secret fields inside connection auth are encrypted/decrypted automatically by the
 * same helper. Unknown keys, such as token expiry timestamps, are passed through
 * unchanged.
 */
const SECURE_AUTH_FIELDS = [
  'accessToken',
  'refreshToken',
  'signingSecret',
  'clientSecret',
  'routingKey',
  'apiKey',
  'url',
  'headers',
  'method',
] as const;

export interface ChannelConnectionAuth {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
  signingSecret?: string;
  clientSecret?: string;
  /**
   * PagerDuty Events API v2 integration key. 32-character alphanumeric string. Encrypted at rest.
   */
  routingKey?: string;
  /**
   * Opsgenie API integration key (GenieKey). UUID-format string. Encrypted at rest.
   */
  apiKey?: string;
  /**
   * Account region ('us' | 'eu'). Non-secret; travels with the secret so we route
   * to the correct data-center endpoint (e.g. `api.opsgenie.com` vs `api.eu.opsgenie.com`,
   * `events.pagerduty.com` vs `events.eu.pagerduty.com`).
   */
  region?: 'us' | 'eu';
  /**
   * Tool-webhook per-subscriber URL. Capability URLs are secrets; encrypted at rest.
   */
  url?: string;
  /**
   * Tool-webhook per-subscriber request headers. Each string value is encrypted at rest.
   */
  headers?: Record<string, string>;
  /**
   * Tool-webhook per-subscriber HTTP method override. Encrypted at rest with the other secrets.
   */
  method?: 'POST' | 'PUT' | 'PATCH';
  [key: string]: unknown;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'string');
}

function transformSecureFields<T extends object>(auth: T, transform: (value: string) => string): T {
  const result: Record<string, unknown> = { ...(auth as Record<string, unknown>) };

  for (const key of SECURE_AUTH_FIELDS) {
    const value = result[key];
    if (typeof value === 'string' && value.length > 0) {
      result[key] = transform(value);
    } else if (isStringRecord(value)) {
      const transformed: Record<string, string> = {};
      for (const [headerKey, headerValue] of Object.entries(value)) {
        transformed[headerKey] = headerValue.length > 0 ? transform(headerValue) : headerValue;
      }
      result[key] = transformed;
    }
  }

  return result as T;
}
/**
 * Encrypt every secret field inside a channel-connection `auth` object.
 *
 * Uses the same prefix-based pattern as `encryptApiKey` so that calling this
 * helper on an already-encrypted record is a no-op (idempotent). That keeps
 * existing unencrypted records working without a forced migration and lets
 * write paths run the helper unconditionally on every save.
 */
export function encryptChannelConnectionAuth<T extends object | undefined>(auth: T): T {
  if (!auth) {
    return auth;
  }

  return transformSecureFields(auth, encryptApiKey);
}

/**
 * Decrypt every secret field inside a channel-connection `auth` object.
 *
 * Idempotent: legacy unprefixed values pass through unchanged, so this is safe
 * to call on any record regardless of when it was written. Always decrypt at
 * use-time only — never persist the decrypted form back to the database.
 */
export function decryptChannelConnectionAuth<T extends object | undefined>(auth: T): T {
  if (!auth) {
    return auth;
  }

  return transformSecureFields(auth, decryptApiKey);
}
