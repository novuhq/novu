import { Logger } from '@nestjs/common';
import { ContextPayload } from '@novu/shared';
import { canonicalize } from '@tufjs/canonical-json';
import { createHmac } from 'crypto';

/**
 * Build a `novu-signature` header.
 *
 * Header format: `t=<unix-ms>,v1=<hmac>[,v1=<hmac>...]`.
 * One `v1` is produced per secret key, in the order given. Callers pass the
 * original key first so verifiers that only read the first signature keep
 * working. Bridge callers put another key first once a bridge has rejected the
 * original key's signature (see `bridge-signing-keys.ts`). Verifiers that
 * check every `v1` accept any order.
 */
export function buildNovuSignatureHeader(secretKey: string | readonly string[], payload: unknown): string {
  const secretKeys = typeof secretKey === 'string' ? [secretKey] : [...secretKey];

  if (secretKeys.length === 0) {
    throw new Error('At least one secret key is required to build a novu-signature header');
  }

  const timestamp = Date.now();
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signatures = secretKeys.map((key) => `v1=${createHmac('sha256', key).update(signedPayload).digest('hex')}`);

  return `t=${timestamp},${signatures.join(',')}`;
}

export function createHash(key: string, valueToHash: string): string | null {
  Logger.verbose('Creating Hmac');

  if (!key || !valueToHash) {
    Logger.warn(
      `createHash called with invalid arguments: key=${key ? '[SET]' : '[EMPTY]'}, valueToHash=${valueToHash ? '[SET]' : '[EMPTY]'}`
    );

    return null;
  }

  return createHmac('sha256', key).update(valueToHash).digest('hex');
}

export function createContextHash(apiKey: string, context: ContextPayload): string | null {
  const canonicalContext = canonicalize(context);

  return createHash(apiKey, canonicalContext);
}
