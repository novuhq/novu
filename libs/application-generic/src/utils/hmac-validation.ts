import { createContextHash, createHash } from './hmac';
import { decryptApiKey } from '../encryption/encrypt-provider';

export function isHmacValidWithSecrets(secretKeys: string[], subscriberId: string, hmacHash: string | undefined) {
  if (!hmacHash || secretKeys.length === 0) {
    return false;
  }

  return secretKeys.some((secretKey) => {
    const key = decryptApiKey(secretKey);

    return createHash(key, subscriberId) === hmacHash;
  });
}

export function isContextHmacValidWithSecrets(
  secretKeys: string[],
  context: Parameters<typeof createContextHash>[1],
  contextHash: string | undefined
): boolean {
  if (!contextHash || secretKeys.length === 0) {
    return false;
  }

  return secretKeys.some((secretKey) => {
    const key = decryptApiKey(secretKey);

    return createContextHash(key, context) === contextHash;
  });
}
