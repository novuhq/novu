import { Injectable } from '@nestjs/common';
import { AnalyticsService, GetLayoutUseCase, PinoLogger } from '@novu/application-generic';
import { ChangeRepository, LayoutRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

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
    private analyticsService: AnalyticsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SetDefaultLayoutCommand) {
    const isV2Layout =
      command.origin === ResourceOriginEnum.NOVU_CLOUD || command.origin === ResourceOriginEnum.EXTERNAL;

    const layout = await this.getLayout.execute({
      layoutIdOrInternalId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      type: command.type,
      origin: command.origin,
    });

    const existingDefaultLayoutId = await this.findExistingDefaultLayoutId(layout._id as string, command, isV2Layout);

    if (!existingDefaultLayoutId) {
      await this.createDefaultChange(command, isV2Layout);

      return;
    }

    try {
      await this.setIsDefaultForLayout(existingDefaultLayoutId, command.environmentId, command.organizationId, false);

      if (!isV2Layout) {
        const existingParentChangeId = await this.getParentChangeId(command.environmentId, existingDefaultLayoutId);
        const previousDefaultLayoutChangeId = await this.changeRepository.getChangeId(
          command.environmentId,
          ChangeEntityTypeEnum.DEFAULT_LAYOUT,
          existingDefaultLayoutId
        );

        await this.createLayoutChangeForPreviousDefault(
          command,
          existingDefaultLayoutId,
          previousDefaultLayoutChangeId,
          isV2Layout
        );

        await this.setIsDefaultForLayout(layout._id as string, command.environmentId, command.organizationId, true);
        await this.createDefaultChange(
          {
            ...command,
            parentChangeId: existingParentChangeId || previousDefaultLayoutChangeId,
          },
          isV2Layout
        );
      }

      this.analyticsService.track('[Layout] - Set default layout', command.userId, {
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        newDefaultLayoutId: layout._id,
        previousDefaultLayout: existingDefaultLayoutId,
      });
    } catch (error) {
      this.logger.error({ err: error });
      // TODO: Rollback through transactions
    }
  }

  private async createLayoutChangeForPreviousDefault(
    command: SetDefaultLayoutCommand,
    layoutId: LayoutId,
    changeId: string,
    isV2Layout: boolean
  ) {
    await this.createDefaultChange({ ...command, layoutId, changeId }, isV2Layout);
  }

  private async findExistingDefaultLayoutId(
    layoutId: LayoutId,
    command: SetDefaultLayoutCommand,
    isV2Layout: boolean
  ): Promise<LayoutId | undefined> {
    const defaultLayout = await this.layoutRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      isDefault: true,
      ...(isV2Layout ? { type: command.type, origin: command.origin } : {}),
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

  private async createDefaultChange(command: CreateDefaultLayoutChangeCommand, isV2Layout: boolean) {
    if (isV2Layout) {
      return;
    }

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
