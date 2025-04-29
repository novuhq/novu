import { createHash, decryptApiKey } from '@novu/application-generic';

export function isHmacValid(secretKey: string, subscriberId: string, hmacHash: string | undefined) {
  if (!hmacHash) {
    return false;
  }

  const key = decryptApiKey(secretKey);
  const computedHmacHash = createHash(key, subscriberId);

  return computedHmacHash === hmacHash;
}
