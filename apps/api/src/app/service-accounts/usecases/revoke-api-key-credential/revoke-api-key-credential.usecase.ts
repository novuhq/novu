import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyCredentialRepository } from '@novu/dal';

import { RevokeApiKeyCredentialCommand } from './revoke-api-key-credential.command';

@Injectable()
export class RevokeApiKeyCredential {
  constructor(private readonly apiKeyCredentialRepository: ApiKeyCredentialRepository) {}

  async execute(command: RevokeApiKeyCredentialCommand): Promise<void> {
    const keys = await this.apiKeyCredentialRepository.listByServiceAccount(
      command.organizationId,
      command.serviceAccountId
    );
    const key = keys.find((entry) => entry._id === command.apiKeyId);

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyCredentialRepository.update(
      {
        _id: command.apiKeyId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          revokedAt: new Date().toISOString(),
        },
      }
    );
  }
}
