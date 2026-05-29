import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyCredentialRepository, ServiceAccountRepository } from '@novu/dal';
import { generateApiKeyV2 } from '@novu/application-generic';
import { ALL_PERMISSIONS, ApiKeyTierEnum, ServiceAccountScopeEnum } from '@novu/shared';

import { CreateApiKeyCredentialResponseDto } from '../../dtos';
import { CreateApiKeyCredentialCommand } from './create-api-key-credential.command';

@Injectable()
export class CreateApiKeyCredential {
  constructor(
    private readonly apiKeyCredentialRepository: ApiKeyCredentialRepository,
    private readonly serviceAccountRepository: ServiceAccountRepository
  ) {}

  async execute(command: CreateApiKeyCredentialCommand): Promise<CreateApiKeyCredentialResponseDto> {
    const serviceAccount = await this.serviceAccountRepository.findById(
      {
        _id: command.serviceAccountId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!serviceAccount) {
      throw new NotFoundException('Service account not found');
    }

    const tier =
      serviceAccount.scope === ServiceAccountScopeEnum.ORGANIZATION
        ? ApiKeyTierEnum.ORGANIZATION
        : ApiKeyTierEnum.ENVIRONMENT;

    const { apiKey, hash, keyPrefix, last4 } = generateApiKeyV2(tier);

    const entity = await this.apiKeyCredentialRepository.create({
      _organizationId: command.organizationId,
      _serviceAccountId: command.serviceAccountId,
      hash,
      keyPrefix,
      last4,
      name: command.name,
      permissions: command.permissions ?? serviceAccount.defaultPermissions ?? ALL_PERMISSIONS,
      metadata: command.metadata,
      expiresAt: command.expiresAt,
    });

    return {
      _id: entity._id,
      serviceAccountId: entity._serviceAccountId,
      keyPrefix: entity.keyPrefix,
      last4: entity.last4,
      name: entity.name,
      permissions: entity.permissions,
      metadata: entity.metadata,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      key: apiKey,
    };
  }
}
