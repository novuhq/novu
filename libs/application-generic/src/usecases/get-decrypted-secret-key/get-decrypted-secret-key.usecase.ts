import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { decryptApiKey } from '../../encryption';
import { SigningSecretResolverService } from '../../services/signing-secret';
import { GetDecryptedSecretKeyCommand } from './get-decrypted-secret-key.command';

@Injectable()
export class GetDecryptedSecretKey {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly signingSecretResolverService: SigningSecretResolverService
  ) {}

  async execute(command: GetDecryptedSecretKeyCommand): Promise<string> {
    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
      },
      ['_id', '_organizationId', 'apiKeys'],
      { readPreference: 'secondaryPreferred' }
    );

    if (!environment) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    const organizationId = command.organizationId ?? environment._organizationId;
    const bridgeSecrets = await this.signingSecretResolverService.getActiveBridgeSecrets(
      command.environmentId,
      organizationId
    );

    if (bridgeSecrets.length > 0) {
      return bridgeSecrets[0];
    }

    if (!environment.apiKeys?.[0]?.key) {
      throw new NotFoundException(`No signing secret found for environment ${command.environmentId}`);
    }

    return decryptApiKey(environment.apiKeys[0].key);
  }
}
