import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { GetDecryptedSecretKeyCommand } from './get-decrypted-secret-key.command';
import { decryptApiKey } from '../../encryption';

@Injectable()
export class GetDecryptedSecretKey {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  async execute(command: GetDecryptedSecretKeyCommand): Promise<string> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
    });

    if (!environment) {
      throw new NotFoundException(
        `Environment ${command.environmentId} not found`,
      );
    }

    return decryptApiKey(environment.apiKeys[0].key);
  }
}
