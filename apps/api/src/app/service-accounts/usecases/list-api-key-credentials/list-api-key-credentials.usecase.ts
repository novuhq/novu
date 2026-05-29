import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyCredentialRepository, ServiceAccountRepository } from '@novu/dal';

import { ApiKeyCredentialResponseDto } from '../../dtos';
import { ListApiKeyCredentialsCommand } from './list-api-key-credentials.command';

@Injectable()
export class ListApiKeyCredentials {
  constructor(
    private readonly apiKeyCredentialRepository: ApiKeyCredentialRepository,
    private readonly serviceAccountRepository: ServiceAccountRepository
  ) {}

  async execute(command: ListApiKeyCredentialsCommand): Promise<ApiKeyCredentialResponseDto[]> {
    const accounts = await this.serviceAccountRepository.listByOrganization(command.organizationId);
    const serviceAccount = accounts.find((entry) => entry._id === command.serviceAccountId);

    if (!serviceAccount) {
      throw new NotFoundException('Service account not found');
    }

    const keys = await this.apiKeyCredentialRepository.listByServiceAccount(
      command.organizationId,
      command.serviceAccountId
    );

    return keys.map((key) => ({
      _id: key._id,
      serviceAccountId: key._serviceAccountId,
      keyPrefix: key.keyPrefix,
      last4: key.last4,
      name: key.name,
      permissions: key.permissions,
      metadata: key.metadata,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    }));
  }
}
