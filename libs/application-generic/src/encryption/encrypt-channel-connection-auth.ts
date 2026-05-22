import { decryptApiKey, encryptApiKey } from './encrypt-provider';

/**
 * Fields inside a `ChannelConnection.auth` object that must be encrypted at rest.
 *
 * Today the entity only models `accessToken`, but the helper is forward-compatible:
 * if a future provider adds `refreshToken`, `signingSecret`, or `clientSecret` to
 * the auth blob, those values will be encrypted/decrypted automatically by the same
 * helper without needing to touch every caller. Unknown keys are passed through
 * unchanged.
 */
const SECURE_AUTH_FIELDS = ['accessToken', 'refreshToken', 'signingSecret', 'clientSecret'] as const;

export interface ChannelConnectionAuth {
  accessToken?: string;
  refreshToken?: string;
  signingSecret?: string;
  clientSecret?: string;
  [key: string]: unknown;
}

function transformSecureFields<T extends object>(auth: T, transform: (value: string) => string): T {
  const result: Record<string, unknown> = { ...(auth as Record<string, unknown>) };

  for (const key of SECURE_AUTH_FIELDS) {
    const value = result[key];
    if (typeof value === 'string' && value.length > 0) {
      result[key] = transform(value);
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
