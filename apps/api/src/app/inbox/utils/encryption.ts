import { BadRequestException } from '@nestjs/common';
import { createHash, decryptApiKey } from '@novu/application-generic';

export function validateHmacEncryption({
  apiKey,
  subscriberId,
  subscriberHash,
}: {
  apiKey: string;
  subscriberId: string;
  subscriberHash?: string;
}) {
  if (!isHmacValid({ apiKey, subscriberId, subscriberHash })) {
    throw new BadRequestException('Please provide a valid HMAC hash');
  }
}

export function isHmacValid({
  apiKey,
  subscriberId,
  subscriberHash,
}: {
  apiKey: string;
  subscriberId: string;
  subscriberHash?: string;
}): boolean {
  const key = decryptApiKey(apiKey);
  const hmacHash = createHash(key, subscriberId);

  return hmacHash === subscriberHash;
}
