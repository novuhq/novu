import { BadRequestException } from '@nestjs/common';
import { restoreMaskedConfigurations, restoreMaskedCredentials } from '@novu/shared';

function assertAllRestored(kind: 'credentials' | 'configurations', unresolvedKeys: string[]): void {
  if (unresolvedKeys.length > 0) {
    throw new BadRequestException(
      `Masked values can't be saved as ${kind}: ${unresolvedKeys.join(', ')}. Send the full secret instead.`
    );
  }
}

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
  assertAllRestored('credentials', restored.unresolvedKeys);

  return restored.credentials;
}

/** The same for settings, whose secret is the inbound webhook signing key. */
export function restoreMaskedIntegrationConfigurations<T extends object>(
  configurations: T,
  storedConfigurations: object | undefined
): T {
  const restored = restoreMaskedConfigurations(configurations, storedConfigurations);
  assertAllRestored('configurations', restored.unresolvedKeys);

  return restored.configurations;
}
