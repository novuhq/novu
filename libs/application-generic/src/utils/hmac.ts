import { Logger } from '@nestjs/common';
import { ContextPayload } from '@novu/shared';
import { canonicalize } from '@tufjs/canonical-json';
import { createHmac } from 'crypto';

export function createHash(key: string, valueToHash: string) {
  Logger.verbose('Creating Hmac');

  return createHmac('sha256', key).update(valueToHash).digest('hex');
}

export function createContextHash(apiKey: string, context: ContextPayload): string {
  const canonicalContext = canonicalize(context);

  return createHash(apiKey, canonicalContext);
}
