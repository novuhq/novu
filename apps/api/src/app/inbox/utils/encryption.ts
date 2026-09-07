import { BadRequestException } from '@nestjs/common';
import { ContextPayload } from '@novu/shared';
import { isContextHmacValidForAnyKey, isHmacValidForAnyKey } from '../../shared/helpers/is-valid-hmac';

export function validateHmacEncryption({
  apiKeys,
  subscriberId,
  subscriberHash,
}: {
  apiKeys: string[];
  subscriberId: string;
  subscriberHash?: string;
}) {
  if (!isHmacValidForAnyKey(apiKeys, subscriberId, subscriberHash)) {
    throw new BadRequestException('Please provide a valid HMAC hash');
  }
}

export function validateContextHmacEncryption({
  apiKeys,
  context,
  contextHash,
}: {
  apiKeys: string[];
  context: ContextPayload;
  contextHash?: string;
}) {
  if (!isContextHmacValidForAnyKey(apiKeys, context, contextHash)) {
    throw new BadRequestException('Please provide a valid context HMAC hash');
  }
}
