import { Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

export function createHash(key: string, valueToHash: string) {
  Logger.verbose('Creating Hmac');

  return createHmac('sha256', key).update(valueToHash).digest('hex');
}
