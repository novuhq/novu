import { decryptApiKey, encryptApiKey } from './encrypt-provider';

/**
 * Fields inside an `McpConnection.auth` object that must be encrypted at rest.
 * Kept in sync with `McpConnectionAuth` in `@novu/dal`. Unknown keys pass
 * through unchanged so adding a new secret field doesn't silently leak a
 * plaintext value — the type of the entity must be updated alongside this
 * list, and the helper applies the new key on both encrypt and decrypt
 * passes.
 */
const SECURE_AUTH_FIELDS = ['accessToken', 'refreshToken'] as const;

export interface McpConnectionAuthInput {
  accessToken?: string;
  refreshToken?: string;
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
 * Encrypt every secret field inside an `mcp_connection.auth` object.
 *
 * Uses the same prefix-based pattern as `encryptApiKey` so calling this
 * helper on an already-encrypted record is a no-op (idempotent). Safe to
 * run unconditionally on every save.
 */
export function encryptMcpConnectionAuth<T extends object | undefined>(auth: T): T {
  if (!auth) {
    return auth;
  }

  return transformSecureFields(auth, encryptApiKey);
}

/**
 * Decrypt every secret field inside an `mcp_connection.auth` object.
 *
 * Idempotent: legacy unprefixed values pass through unchanged. Always
 * decrypt at use-time only — never persist the decrypted form back.
 */
export function decryptMcpConnectionAuth<T extends object | undefined>(auth: T): T {
  if (!auth) {
    return auth;
  }

  return transformSecureFields(auth, decryptApiKey);
}
