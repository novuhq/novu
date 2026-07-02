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

/**
 * Fields inside an `McpConnection.oauthClient` object that must be encrypted
 * at rest. The list is intentionally separate from `SECURE_AUTH_FIELDS` so
 * adding a new secret on the access-token side cannot accidentally encrypt
 * the wrong field on the DCR client identity, and vice versa.
 */
const SECURE_OAUTH_CLIENT_FIELDS = ['clientSecret', 'registrationAccessToken'] as const;

export interface McpConnectionAuthInput {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

export interface McpConnectionOAuthClientInput {
  clientSecret?: string;
  registrationAccessToken?: string;
  [key: string]: unknown;
}

function transformFields<T extends object>(
  source: T,
  fieldList: readonly string[],
  transform: (value: string) => string
): T {
  const result: Record<string, unknown> = { ...(source as Record<string, unknown>) };

  for (const key of fieldList) {
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

  return transformFields(auth, SECURE_AUTH_FIELDS, encryptApiKey);
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

  return transformFields(auth, SECURE_AUTH_FIELDS, decryptApiKey);
}

/**
 * Encrypt every secret field inside an `mcp_connection.oauthClient` object
 * (DCR client credentials per RFC 7591). Idempotent.
 */
export function encryptMcpConnectionOAuthClient<T extends object | undefined>(client: T): T {
  if (!client) {
    return client;
  }

  return transformFields(client, SECURE_OAUTH_CLIENT_FIELDS, encryptApiKey);
}

/**
 * Decrypt every secret field inside an `mcp_connection.oauthClient` object.
 * Idempotent — legacy unprefixed values pass through unchanged.
 */
export function decryptMcpConnectionOAuthClient<T extends object | undefined>(client: T): T {
  if (!client) {
    return client;
  }

  return transformFields(client, SECURE_OAUTH_CLIENT_FIELDS, decryptApiKey);
}
