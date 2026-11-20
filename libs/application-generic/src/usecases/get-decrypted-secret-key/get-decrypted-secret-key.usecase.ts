import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { decryptApiKey } from '../../encryption';
import { GetDecryptedSecretKeyCommand } from './get-decrypted-secret-key.command';

@Injectable()
export class GetDecryptedSecretKey {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(command: GetDecryptedSecretKeyCommand): Promise<string> {
    const secretKeys = await this.executeAll(command);
    const secretKey = secretKeys.at(0);

    if (!secretKey) {
      throw new NotFoundException(`Environment ${command.environmentId} has no secret keys`);
    }

    return secretKey;
  }

  /**
   * Every active secret key, oldest first. New keys are appended, so the
   * original key stays at index 0 until it is deleted. Callers that sign or
   * verify bridge requests use the full list so either key works during a
   * rolling rotation.
   */
  async executeAll(command: GetDecryptedSecretKeyCommand): Promise<string[]> {
    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
      },
      '_id apiKeys',
      { readPreference: 'secondaryPreferred' }
    );

    if (!environment) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    const secretKeys = (environment.apiKeys ?? []).map((apiKey) => decryptApiKey(apiKey.key));

    if (secretKeys.length === 0) {
      throw new NotFoundException(`Environment ${command.environmentId} has no secret keys`);
    }

    return secretKeys;
  }
}
