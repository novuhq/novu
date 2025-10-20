import { createContextHash, createHash, decryptApiKey } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';

export function isHmacValid(secretKey: string, subscriberId: string, hmacHash: string | undefined) {
  if (!hmacHash) {
    return false;
  }

  const key = decryptApiKey(secretKey);
  const computedHmacHash = createHash(key, subscriberId);

  return computedHmacHash === hmacHash;
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

  return computedContextHash === contextHash;
}
