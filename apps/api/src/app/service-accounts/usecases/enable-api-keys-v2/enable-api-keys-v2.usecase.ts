import { BadRequestException, Injectable } from '@nestjs/common';
import { SigningSecretResolverService } from '@novu/application-generic';

import { EnableApiKeysV2Command } from './enable-api-keys-v2.command';

@Injectable()
export class EnableApiKeysV2 {
  constructor(private readonly signingSecretResolverService: SigningSecretResolverService) {}

  async execute(command: EnableApiKeysV2Command): Promise<{ seeded: boolean }> {
    const { environmentId, organizationId } = command;

    if (!environmentId) {
      throw new BadRequestException('environmentId is required to enable API Keys v2');
    }

    if (!organizationId) {
      throw new BadRequestException('organizationId is required to enable API Keys v2');
    }

    await this.signingSecretResolverService.seedFromLegacyApiKey(environmentId, organizationId);

    return { seeded: true };
  }
}
