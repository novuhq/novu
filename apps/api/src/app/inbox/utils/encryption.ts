import { BadRequestException } from '@nestjs/common';
import { ContextPayload } from '@novu/shared';
import { isContextHmacValid, isHmacValid } from '../../shared/helpers/is-valid-hmac';

export function validateHmacEncryption({
  apiKey,
  subscriberId,
  subscriberHash,
}: {
  apiKey: string;
  subscriberId: string;
  subscriberHash?: string;
}) {
  if (!isHmacValid(apiKey, subscriberId, subscriberHash)) {
    throw new BadRequestException('Please provide a valid HMAC hash');
  }
}

export function validateContextHmacEncryption({
  apiKey,
  context,
  contextHash,
}: {
  apiKey: string;
  context: ContextPayload;
  contextHash?: string;
}) {
  if (!isContextHmacValid(apiKey, context, contextHash)) {
    throw new BadRequestException('Please provide a valid context HMAC hash');
  }
}
