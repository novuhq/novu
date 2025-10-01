import { createHmac } from 'crypto';

export function createHash(key: string, valueToHash: string) {
  return createHmac('sha256', key).update(valueToHash).digest('hex');
}
