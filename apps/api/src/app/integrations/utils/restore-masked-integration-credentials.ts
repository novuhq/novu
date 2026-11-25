import { BadRequestException } from '@nestjs/common';
import { restoreMaskedCredentials } from '@novu/shared';

/**
 * Clients only ever see a secret as its mask, and send the mask back to keep the secret as it is.
 * Returns the credentials to save, with the stored secret in place of each mask.
 */
export function restoreMaskedIntegrationCredentials<T extends object>(
  providerId: string,
  credentials: T,
  storedCredentials: object | undefined
): T {
  const restored = restoreMaskedCredentials(providerId, credentials, storedCredentials);

  if (restored.unresolvedKeys.length > 0) {
    throw new BadRequestException(
      `Masked values can't be saved as credentials: ${restored.unresolvedKeys.join(', ')}. Send the full secret instead.`
    );
  }

  return restored.credentials;
}
