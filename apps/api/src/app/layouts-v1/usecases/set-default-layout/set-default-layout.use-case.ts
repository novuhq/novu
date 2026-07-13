import { Injectable } from '@nestjs/common';
import { AnalyticsService, GetLayoutUseCaseV0, PinoLogger } from '@novu/application-generic';
import { ChangeRepository, ClientSession, LayoutRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, ResourceOriginEnum } from '@novu/shared';

import { EnvironmentId, LayoutId, OrganizationId } from '../../types';
import { CreateDefaultLayoutChangeCommand } from '../create-default-layout-change/create-default-layout-change.command';
import { CreateDefaultLayoutChangeUseCase } from '../create-default-layout-change/create-default-layout-change.usecase';
import { SetDefaultLayoutCommand } from './set-default-layout.command';

@Injectable()
export class SetDefaultLayoutUseCase {
  constructor(
    private getLayoutV0: GetLayoutUseCaseV0,
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

    const layout = await this.getLayoutV0.execute({
      layoutIdOrInternalId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      type: command.type,
      origin: command.origin,
    });

    let existingDefaultLayoutId: LayoutId | undefined;
    await this.layoutRepository.withTransaction(async (session) => {
      existingDefaultLayoutId = await this.findExistingDefaultLayoutId(
        layout._id as string,
        command,
        isV2Layout,
        session
      );

      if (existingDefaultLayoutId) {
        await this.setIsDefaultForLayout(
          existingDefaultLayoutId,
          command.environmentId,
          command.organizationId,
          false,
          session
        );
      }

      await this.setIsDefaultForLayout(
        layout._id as string,
        command.environmentId,
        command.organizationId,
        true,
        session
      );

      if (!isV2Layout && existingDefaultLayoutId) {
        const existingParentChangeId = await this.getParentChangeId(
          command.environmentId,
          existingDefaultLayoutId,
          session
        );
        const previousDefaultLayoutChangeId = await this.changeRepository.getChangeId(
          command.environmentId,
          ChangeEntityTypeEnum.DEFAULT_LAYOUT,
          existingDefaultLayoutId,
          session
        );

        await this.createLayoutChangeForPreviousDefault(
          command,
          existingDefaultLayoutId,
          previousDefaultLayoutChangeId,
          isV2Layout,
          session
        );

        await this.createDefaultChange(
          {
            ...command,
            parentChangeId: existingParentChangeId || previousDefaultLayoutChangeId,
          },
          isV2Layout,
          session
        );
      } else {
        await this.createDefaultChange(command, isV2Layout, session);
      }
    });

    this.analyticsService.track('[Layout] - Set default layout', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      newDefaultLayoutId: layout._id,
      previousDefaultLayout: existingDefaultLayoutId,
    });
  }

  private async createLayoutChangeForPreviousDefault(
    command: SetDefaultLayoutCommand,
    layoutId: LayoutId,
    changeId: string,
    isV2Layout: boolean,
    session: ClientSession | null
  ) {
    await this.createDefaultChange({ ...command, layoutId, changeId }, isV2Layout, session);
  }

  private async findExistingDefaultLayoutId(
    layoutId: LayoutId,
    command: SetDefaultLayoutCommand,
    isV2Layout: boolean,
    session: ClientSession | null
  ): Promise<LayoutId | undefined> {
    const defaultLayout = await this.layoutRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        isDefault: true,
        ...(isV2Layout ? { type: command.type, origin: command.origin } : {}),
        _id: { $ne: layoutId },
      },
      undefined,
      { session }
    );

    if (!defaultLayout) {
      return undefined;
    }

    return defaultLayout._id;
  }

  private async setIsDefaultForLayout(
    layoutId: LayoutId,
    environmentId: EnvironmentId,
    organizationId: OrganizationId,
    isDefault: boolean,
    session: ClientSession | null
  ): Promise<void> {
    await this.layoutRepository.updateIsDefault(layoutId, environmentId, organizationId, isDefault, { session });
  }

  private async createDefaultChange(
    command: CreateDefaultLayoutChangeCommand,
    isV2Layout: boolean,
    session: ClientSession | null
  ) {
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

    await this.createDefaultLayoutChange.execute(createLayoutChangeCommand, session);
  }

  private async getParentChangeId(environmentId: string, layoutId: string, session: ClientSession | null) {
    const parentChangeId = await this.changeRepository.getParentId(
      environmentId,
      ChangeEntityTypeEnum.DEFAULT_LAYOUT,
      layoutId,
      session
    );

    return parentChangeId;
  }
}
