import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AnalyticsService,
  GetLayoutCommand,
  GetLayoutUseCase,
  LayoutResponseDto,
  PinoLogger,
} from '@novu/application-generic';
import { ClientSession, ControlValuesRepository, LayoutRepository, LocalizationResourceEnum } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { DeleteLayoutCommand } from './delete-layout.command';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const { environmentId, organizationId, userId } = command;
    const layout = await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId,
        organizationId,
        userId,
        skipAdditionalFields: true,
      })
    );

    if (layout.isDefault) {
      throw new ConflictException(
        `Layout with id ${command.layoutIdOrInternalId} is being used as a default layout, it can not be deleted`
      );
    }

    await this.layoutRepository.withTransaction(async (session) => {
      await this.removeLayoutReferencesFromStepControls(
        {
          layoutId: layout.layoutId!,
          environmentId,
          organizationId,
        },
        session
      );

      await this.deleteTranslationGroup(layout, command, session);

      await this.layoutRepository.deleteLayout(layout._id!, environmentId, organizationId, { session });

      await this.controlValuesRepository.delete(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _layoutId: layout._id!,
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        },
        { session }
      );
    });

    this.analyticsService.track('Delete layout - [Layouts]', userId, {
      _organizationId: organizationId,
      _environmentId: environmentId,
      layoutId: layout._id!,
    });
  }

  private async removeLayoutReferencesFromStepControls(
    {
      layoutId,
      environmentId,
      organizationId,
    }: {
      layoutId: string;
      environmentId: string;
      organizationId: string;
    },
    session: ClientSession | null
  ): Promise<void> {
    await this.controlValuesRepository.update(
      {
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        _environmentId: environmentId,
        _organizationId: organizationId,
        'controls.layoutId': layoutId,
      },
      { $unset: { 'controls.layoutId': '' } },
      { session }
    );
  }

  private async deleteTranslationGroup(
    layout: LayoutResponseDto,
    command: DeleteLayoutCommand,
    session: ClientSession | null
  ) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const deleteTranslationGroupUseCase = this.getDeleteTranslationGroupUseCase();

      await deleteTranslationGroupUseCase.execute({
        resourceId: layout.layoutId,
        resourceType: LocalizationResourceEnum.LAYOUT,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        session,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return;
      }

      this.logger.error(
        {
          layoutId: layout.layoutId,
          organizationId: command.organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to delete translations for layout`
      );

      throw error;
    }
  }

  private getDeleteTranslationGroupUseCase() {
    return this.moduleRef.get(require('@novu/ee-translation')?.DeleteTranslationGroup, {
      strict: false,
    });
  }
}
