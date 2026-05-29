import { ContextPayload } from '@novu/shared';

import {
  isContextHmacValidWithSecretKeys,
  isHmacValidWithSecretKeys,
} from '../../shared/helpers/is-valid-hmac';

export function validateHmacEncryption({
  secretKeys,
  subscriberId,
  subscriberHash,
}: {
  secretKeys: string[];
  subscriberId: string;
  subscriberHash?: string;
}) {
  if (!isHmacValidWithSecretKeys(secretKeys, subscriberId, subscriberHash)) {
    throw new Error('Invalid subscriber HMAC hash');
  }
}

export function validateContextHmacEncryption({
  secretKeys,
  context,
  contextHash,
}: {
  secretKeys: string[];
  context: ContextPayload;
  contextHash?: string;
}) {
  if (!isContextHmacValidWithSecretKeys(secretKeys, context, contextHash)) {
    throw new Error('Invalid context HMAC hash');
  }
}
