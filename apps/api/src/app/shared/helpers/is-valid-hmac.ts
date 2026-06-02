import { timingSafeEqual } from 'node:crypto';
import { createContextHash, createHash, decryptApiKey } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';

export function areHexDigestsEqual(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

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
