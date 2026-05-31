import { decryptMcpConnectionOAuthClient } from '@novu/application-generic';
import { type McpConnectionOAuthClient } from '@novu/dal';

/**
 * Decide whether to reuse the row's existing DCR-issued client. Returns the
 * decrypted client when:
 *  - the row has an `oauthClient`,
 *  - the recorded `issuer` matches the AS metadata `issuer` (no rotation),
 *  - `clientSecretExpiresAt` is in the future (or absent, meaning non-expiring), and
 *  - the recorded `redirectUri` matches the current `buildMcpOAuthRedirectUri()`
 *    value (legacy rows without `redirectUri` are never reused so they get
 *    re-registered with the field populated).
 *
 * Otherwise returns `undefined` and the caller re-registers.
 *
 * NOTE: `McpConnectionOAuthClient.clientSecretExpiresAt` is declared as `Date`
 * on the entity type, but `BaseRepositoryV2.mapProjectedEntity` runs the row
 * through `convertObjectIds` (see `libs/dal/src/repositories/projection.types.ts`)
 * which serialises every `Date` instance to an ISO string. So at runtime this
 * field is a string when loaded from Mongo, and only a `Date` immediately
 * after construction in-process. We accept both shapes — `new Date(value)`
 * happily takes either.
 */
export function pickReusableOAuthClient(
  client: McpConnectionOAuthClient | undefined,
  asIssuer: string,
  redirectUri: string
): McpConnectionOAuthClient | undefined {
  if (!client) return undefined;
  if (client.issuer !== asIssuer) return undefined;
  if (!client.redirectUri || client.redirectUri !== redirectUri) return undefined;
  if (client.clientSecretExpiresAt) {
    const expiresMs = new Date(client.clientSecretExpiresAt as unknown as string | Date).getTime();
    // A corrupted/unparseable timestamp is treated as non-reusable so we never
    // replay a bad client config — re-register instead of trusting it.
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      return undefined;
    }
  }

  return decryptMcpConnectionOAuthClient(client);
}
