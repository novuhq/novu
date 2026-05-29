import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvironmentRepository, ServiceAccountRepository } from '@novu/dal';
import { ALL_PERMISSIONS, ServiceAccountScopeEnum } from '@novu/shared';

import { ServiceAccountResponseDto } from '../../dtos';
import { CreateServiceAccountCommand } from './create-service-account.command';

@Injectable()
export class CreateServiceAccount {
  constructor(
    private readonly serviceAccountRepository: ServiceAccountRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: CreateServiceAccountCommand): Promise<ServiceAccountResponseDto> {
    if (command.scope === ServiceAccountScopeEnum.ENVIRONMENT && !command.environmentId) {
      throw new BadRequestException('environmentId is required for environment-scoped service accounts');
    }

    if (command.scope === ServiceAccountScopeEnum.ENVIRONMENT && command.environmentId) {
      const environment = await this.environmentRepository.findOne(
        {
          _id: command.environmentId,
          _organizationId: command.organizationId,
        },
        '_id'
      );

      if (!environment) {
        throw new BadRequestException('Environment not found');
      }
    }

    const entity = await this.serviceAccountRepository.create({
      _organizationId: command.organizationId,
      name: command.name,
      scope: command.scope,
      _environmentId: command.scope === ServiceAccountScopeEnum.ENVIRONMENT ? command.environmentId : undefined,
      defaultPermissions: command.defaultPermissions ?? ALL_PERMISSIONS,
      _createdByUserId: command.userId,
      metadata: command.metadata,
    });

    return this.mapToDto(entity);
  }

  private mapToDto(entity: {
    _id: string;
    name: string;
    scope: ServiceAccountScopeEnum;
    _environmentId?: string;
    defaultPermissions: CreateServiceAccountCommand['defaultPermissions'];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): ServiceAccountResponseDto {
    return {
      _id: entity._id,
      name: entity.name,
      scope: entity.scope,
      environmentId: entity._environmentId,
      defaultPermissions: entity.defaultPermissions ?? ALL_PERMISSIONS,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
