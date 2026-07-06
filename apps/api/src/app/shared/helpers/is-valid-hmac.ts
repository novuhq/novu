import { createContextHash, createHash, decryptApiKey } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { areHexDigestsEqual } from './timing-safe-equal';

export function isHmacValid(secretKey: string, subscriberId: string, hmacHash: string | undefined) {
  if (!hmacHash) {
    return false;
  }

  const key = decryptApiKey(secretKey);
  const computedHmacHash = createHash(key, subscriberId);

  if (!computedHmacHash) {
    return false;
  }

  return areHexDigestsEqual(computedHmacHash, hmacHash);
}

/**
 * Validates the HMAC against every active API key of the environment, so that
 * clients signed with either key keep working during a rolling key rotation.
 */
export function isHmacValidForAnyKey(secretKeys: string[], subscriberId: string, hmacHash: string | undefined) {
  return secretKeys.some((secretKey) => isHmacValid(secretKey, subscriberId, hmacHash));
}

export function isContextHmacValid(
  secretKey: string,
  context: ContextPayload,
  contextHash: string | undefined
): boolean {
  if (!contextHash) {
    return false;
  }

  const key = decryptApiKey(secretKey);
  const computedContextHash = createContextHash(key, context);

  if (!computedContextHash) {
    return false;
  }

  return areHexDigestsEqual(computedContextHash, contextHash);
}

/**
 * Validates the context HMAC against every active API key of the environment,
 * so that clients signed with either key keep working during a rolling key rotation.
 */
export function isContextHmacValidForAnyKey(
  secretKeys: string[],
  context: ContextPayload,
  contextHash: string | undefined
): boolean {
  return secretKeys.some((secretKey) => isContextHmacValid(secretKey, context, contextHash));
}
