import { createContextHash, createHash, decryptApiKey, isContextHmacValidWithSecrets, isHmacValidWithSecrets } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';

export function isHmacValid(secretKey: string, subscriberId: string, hmacHash: string | undefined) {
  return isHmacValidWithSecrets([secretKey], subscriberId, hmacHash);
}

export function isHmacValidWithSecretKeys(secretKeys: string[], subscriberId: string, hmacHash: string | undefined) {
  return isHmacValidWithSecrets(secretKeys, subscriberId, hmacHash);
}

export function isContextHmacValid(
  secretKey: string,
  context: ContextPayload,
  contextHash: string | undefined
): boolean {
  return isContextHmacValidWithSecrets([secretKey], context, contextHash);
}

export function isContextHmacValidWithSecretKeys(
  secretKeys: string[],
  context: ContextPayload,
  contextHash: string | undefined
): boolean {
  return isContextHmacValidWithSecrets(secretKeys, context, contextHash);
}

export function decryptSecretKeyForHmac(secretKey: string): string {
  return decryptApiKey(secretKey);
}

export function createHmacHash(secretKey: string, valueToHash: string): string | null {
  const key = decryptSecretKeyForHmac(secretKey);

  return createHash(key, valueToHash);
}

export function createContextHmacHash(secretKey: string, context: ContextPayload): string | null {
  const key = decryptSecretKeyForHmac(secretKey);

  return createContextHash(key, context);
}
