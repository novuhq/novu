import { createHmac } from 'node:crypto';
import { LRUCache } from 'lru-cache';

/**
 * Lets a bridge move to a newer secret key during a rolling rotation without
 * upgrading its SDK.
 *
 * Older `@novu/framework` and `@novu/chat-sdk-adapter` versions verify only the
 * first `v1` in `novu-signature`, so a bridge that already uses the newer key
 * rejects a request whose first `v1` comes from the original key. The caller
 * then sends the request again with another key's signature first. The key
 * that worked is remembered per bridge, so later requests put it first
 * straight away.
 *
 * Only an HMAC fingerprint of the key is kept, and a fingerprint is used only
 * while it still matches an active key. Deleting or regenerating a key needs no
 * invalidation: the stale fingerprint never matches again.
 *
 * The cache is process-local on purpose. It holds one short string per bridge
 * that is mid-rotation, and reading it costs no network or database access.
 */

export const SIGNATURE_MISMATCH_ERROR_CODE = 'SignatureMismatchError';

const ACCEPTED_KEY_TTL_MS = 5 * 60 * 1000;
const MAX_REMEMBERED_BRIDGES = 10_000;

const acceptedKeyFingerprints = new LRUCache<string, string>({
  max: MAX_REMEMBERED_BRIDGES,
  ttl: ACCEPTED_KEY_TTL_MS,
});

const FINGERPRINT_LABEL = 'novu-bridge-accepted-signing-key';

/**
 * Identifies a key without storing it: an HMAC of a fixed label keyed with the
 * secret, the same operation used to sign bridge requests.
 */
function fingerprint(secretKey: string): string {
  return createHmac('sha256', secretKey).update(FINGERPRINT_LABEL).digest('hex');
}

/**
 * Identifies one bridge of one environment. Agents and stateless bridge URLs
 * can point at a different server than the environment bridge, and each may be
 * on a different key.
 */
export function bridgeSigningScope(environmentId: string, bridgeUrl: string): string {
  return `${environmentId}:${bridgeUrl}`;
}

/**
 * Returns the keys to sign with, with the key this bridge last accepted first.
 * Without a remembered key, the stored order (oldest first) is kept. With a
 * single key, nothing is looked up.
 */
export function orderSigningKeys(scope: string, secretKeys: readonly string[]): string[] {
  if (secretKeys.length < 2) {
    return [...secretKeys];
  }

  const acceptedFingerprint = acceptedKeyFingerprints.get(scope);
  if (!acceptedFingerprint) {
    return [...secretKeys];
  }

  const acceptedIndex = secretKeys.findIndex((key) => fingerprint(key) === acceptedFingerprint);
  if (acceptedIndex <= 0) {
    return [...secretKeys];
  }

  return [secretKeys[acceptedIndex], ...secretKeys.filter((_, index) => index !== acceptedIndex)];
}

/**
 * The order to try after a rejected signature: the key that was first moves to
 * the end. Calling it `keys.length - 1` times tries every key first once.
 */
export function nextSigningKeyOrder(secretKeys: readonly string[]): string[] {
  if (secretKeys.length < 2) {
    return [...secretKeys];
  }

  return [...secretKeys.slice(1), secretKeys[0]];
}

export function rememberAcceptedSigningKey(scope: string, secretKey: string): void {
  acceptedKeyFingerprints.set(scope, fingerprint(secretKey));
}

/**
 * True when a framework bridge rejected the request because the first `v1` did
 * not match its key. Any other failure, including other 401s, is not a reason
 * to send a workflow request again.
 */
export function isBridgeSignatureMismatch(statusCode: number | undefined, responseBody: unknown): boolean {
  return (
    statusCode === 401 &&
    typeof responseBody === 'object' &&
    responseBody !== null &&
    (responseBody as { code?: unknown }).code === SIGNATURE_MISMATCH_ERROR_CODE
  );
}

/** Test helper. */
export function clearAcceptedSigningKeys(): void {
  acceptedKeyFingerprints.clear();
}
