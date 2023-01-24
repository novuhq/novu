import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable, Logger } from '@nestjs/common';
import { LayoutDto } from '@novu/shared';

import { SetDefaultLayoutCommand } from './set-default-layout.command';

import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { EnvironmentId, LayoutId, OrganizationId } from '../../types';

@Injectable()
export class SetDefaultLayoutUseCase {
  constructor(private createLayoutChange: CreateLayoutChangeUseCase, private layoutRepository: LayoutRepository) {}

  async execute(command: SetDefaultLayoutCommand) {
    const existingDefaultLayoutId = await this.findExistingDefaultLayoutId(
      command.layoutId,
      command.environmentId,
      command.organizationId
    );

    if (!existingDefaultLayoutId) {
      return;
    }

    try {
      if (existingDefaultLayoutId) {
        await this.setIsDefaultForLayout(existingDefaultLayoutId, command.environmentId, command.organizationId, false);
        await this.createLayoutChangeForPreviousDefault(command, existingDefaultLayoutId);
      }

      await this.setIsDefaultForLayout(command.layoutId, command.environmentId, command.organizationId, true);
    } catch (error) {
      Logger.error(error);
      // TODO: Rollback through transactions
    }
  }

  private async createLayoutChangeForPreviousDefault(
    command: SetDefaultLayoutCommand,
    layoutId: LayoutId
  ): Promise<void> {
    const createLayoutChangeCommand = CreateLayoutChangeCommand.create({
      environmentId: command.environmentId,
      layoutId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    await this.createLayoutChange.execute(createLayoutChangeCommand);
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

  private async findExistingDefaultLayoutId(
    layoutId: LayoutId,
    environmentId: EnvironmentId,
    organizationId: OrganizationId
  ): Promise<LayoutId | undefined> {
    const defaultLayout = await this.layoutRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      isDefault: true,
      _id: { $ne: layoutId },
    });

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
