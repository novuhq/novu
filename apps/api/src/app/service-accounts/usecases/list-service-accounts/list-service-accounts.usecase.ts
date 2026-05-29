import { Injectable } from '@nestjs/common';
import { ServiceAccountRepository } from '@novu/dal';
import { ALL_PERMISSIONS } from '@novu/shared';

import { ServiceAccountResponseDto } from '../../dtos';
import { ListServiceAccountsCommand } from './list-service-accounts.command';

@Injectable()
export class ListServiceAccounts {
  constructor(private readonly serviceAccountRepository: ServiceAccountRepository) {}

  async execute(command: ListServiceAccountsCommand): Promise<ServiceAccountResponseDto[]> {
    const accounts = command.environmentId
      ? await this.serviceAccountRepository.listByEnvironment(command.organizationId, command.environmentId)
      : await this.serviceAccountRepository.listByOrganization(command.organizationId);

    return accounts.map((entity) => ({
      _id: entity._id,
      name: entity.name,
      scope: entity.scope,
      environmentId: entity._environmentId,
      defaultPermissions: entity.defaultPermissions ?? ALL_PERMISSIONS,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));
  }
}
