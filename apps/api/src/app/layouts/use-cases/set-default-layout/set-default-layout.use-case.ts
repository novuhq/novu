import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable, Logger } from '@nestjs/common';

import { SetDefaultLayoutCommand } from './set-default-layout.command';

import { EnvironmentId, LayoutId, OrganizationId } from '../../types';

@Injectable()
export class SetDefaultLayoutUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: SetDefaultLayoutCommand) {
    const defaultLayoutId = await this.findDefaultLayoutId(command.environmentId, command.organizationId);

    try {
      if (defaultLayoutId) {
        await this.setIsDefaultForLayout(defaultLayoutId, command.environmentId, command.organizationId, false);
      }

      await this.setIsDefaultForLayout(command.layoutId, command.environmentId, command.organizationId, true);
    } catch (error) {
      Logger.error(error);
      // TODO: Rollback through transactions
    }
  }

  private mapToEntity(
    domainEntity: SetDefaultLayoutCommand
  ): Pick<LayoutEntity, '_id' | '_environmentId' | '_organizationId' | '_creatorId'> {
    return {
      _id: domainEntity.userId,
      _environmentId: domainEntity.environmentId,
      _organizationId: domainEntity.organizationId,
      _creatorId: domainEntity.userId,
    };
  }

  private async findDefaultLayoutId(
    environmentId: EnvironmentId,
    organizationId: OrganizationId
  ): Promise<LayoutId | undefined> {
    const defaultLayout = await this.layoutRepository.findDefault(environmentId, organizationId);

    if (!defaultLayout) {
      return undefined;
    }

    return defaultLayout._id;
  }

  private async setIsDefaultForLayout(
    layoutId: LayoutId,
    environmentId: EnvironmentId,
    organizationId: OrganizationId,
    isDefault: boolean
  ): Promise<void> {
    this.layoutRepository.updateIsDefault(layoutId, environmentId, organizationId, isDefault);
  }
}
