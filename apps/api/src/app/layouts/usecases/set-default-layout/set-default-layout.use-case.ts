import { Injectable, Logger, Inject } from '@nestjs/common';
import { ChangeRepository, LayoutRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { AnalyticsService, GetLayoutUseCase } from '@novu/application-generic';

import { EnvironmentId, LayoutId, OrganizationId } from '../../types';
import { CreateDefaultLayoutChangeCommand } from '../create-default-layout-change/create-default-layout-change.command';
import { CreateDefaultLayoutChangeUseCase } from '../create-default-layout-change/create-default-layout-change.usecase';
import { SetDefaultLayoutCommand } from './set-default-layout.command';

@Injectable()
export class SetDefaultLayoutUseCase {
  constructor(
    private getLayout: GetLayoutUseCase,
    private createDefaultLayoutChange: CreateDefaultLayoutChangeUseCase,
    private layoutRepository: LayoutRepository,
    private changeRepository: ChangeRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: SetDefaultLayoutCommand) {
    const layout = await this.getLayout.execute(command);

    const existingDefaultLayoutId = await this.findExistingDefaultLayoutId(
      layout._id as string,
      command.environmentId,
      command.organizationId
    );

    if (!existingDefaultLayoutId) {
      await this.createDefaultChange(command);

      return;
    }

    try {
      await this.setIsDefaultForLayout(existingDefaultLayoutId, command.environmentId, command.organizationId, false);

      const existingParentChangeId = await this.getParentChangeId(command.environmentId, existingDefaultLayoutId);
      const previousDefaultLayoutChangeId = await this.changeRepository.getChangeId(
        command.environmentId,
        ChangeEntityTypeEnum.DEFAULT_LAYOUT,
        existingDefaultLayoutId
      );

      await this.createLayoutChangeForPreviousDefault(command, existingDefaultLayoutId, previousDefaultLayoutChangeId);

      await this.setIsDefaultForLayout(layout._id as string, command.environmentId, command.organizationId, true);
      await this.createDefaultChange({
        ...command,
        parentChangeId: existingParentChangeId || previousDefaultLayoutChangeId,
      });

      this.analyticsService.track('[Layout] - Set default layout', command.userId, {
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        newDefaultLayoutId: layout._id,
        previousDefaultLayout: existingDefaultLayoutId,
      });
    } catch (error) {
      Logger.error(error);
      // TODO: Rollback through transactions
    }
  }

  private async createLayoutChangeForPreviousDefault(
    command: SetDefaultLayoutCommand,
    layoutId: LayoutId,
    changeId: string
  ) {
    await this.createDefaultChange({ ...command, layoutId, changeId });
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
    await this.layoutRepository.updateIsDefault(layoutId, environmentId, organizationId, isDefault);
  }

  private async createDefaultChange(command: CreateDefaultLayoutChangeCommand) {
    const createLayoutChangeCommand = CreateDefaultLayoutChangeCommand.create({
      environmentId: command.environmentId,
      layoutId: command.layoutId,
      organizationId: command.organizationId,
      userId: command.userId,
      changeId: command.changeId,
      parentChangeId: command.parentChangeId,
    });

    await this.createDefaultLayoutChange.execute(createLayoutChangeCommand);
  }

  private async getParentChangeId(environmentId: string, layoutId: string) {
    const parentChangeId = await this.changeRepository.getParentId(
      environmentId,
      ChangeEntityTypeEnum.DEFAULT_LAYOUT,
      layoutId
    );

    return parentChangeId;
  }
}
