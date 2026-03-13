import { Logger } from '@nestjs/common';
import { ContextPayload } from '@novu/shared';
import { canonicalize } from '@tufjs/canonical-json';
import { createHmac } from 'crypto';

export function buildNovuSignatureHeader(secretKey: string, payload: unknown): string {
  const timestamp = Date.now();
  const publicKey = `${timestamp}.${JSON.stringify(payload)}`;
  const hmac = createHmac('sha256', secretKey).update(publicKey).digest('hex');

  return `t=${timestamp},v1=${hmac}`;
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
