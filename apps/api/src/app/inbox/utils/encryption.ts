import { ApiException, createHash, decryptApiKey } from '@novu/application-generic';

export function validateHmacEncryption({
  apiKey,
  subscriberId,
  subscriberHash,
}: {
  apiKey: string;
  subscriberId: string;
  subscriberHash?: string;
}) {
  const key = decryptApiKey(apiKey);
  const hmacHash = createHash(key, subscriberId);
  if (hmacHash !== subscriberHash) {
    throw new ApiException('Please provide a valid HMAC hash');
  }
}
