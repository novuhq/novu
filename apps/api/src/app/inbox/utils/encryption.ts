import { BadRequestException } from '@nestjs/common';
import { isHmacValid } from '../../shared/helpers/is-valid-hmac';

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
