import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AnalyticsService,
  GetLayoutCommand,
  GetLayoutUseCase,
  LayoutResponseDto,
  PinoLogger,
} from '@novu/application-generic';
import { ControlValuesRepository, LocalizationResourceEnum } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { UpsertLayout, UpsertLayoutCommand } from '../upsert-layout';
import { DuplicateLayoutCommand } from './duplicate-layout.command';

@Injectable()
export class DuplicateLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private upsertLayoutUseCase: UpsertLayout,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {}

  async execute(command: DuplicateLayoutCommand): Promise<LayoutResponseDto> {
    const originalLayout = await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        skipAdditionalFields: true,
      })
    );

    const originalControlValues = await this.controlValuesRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _layoutId: originalLayout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    const duplicatedLayout = await this.upsertLayoutUseCase.execute(
      UpsertLayoutCommand.create({
        layoutDto: {
          name: command.overrides.name,
          isTranslationEnabled: command.overrides.isTranslationEnabled,
          controlValues: originalControlValues?.controls ?? null,
        },
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    this.analyticsService.track('Duplicate layout - [Layouts]', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      originalLayoutId: originalLayout._id!,
      duplicatedLayoutId: duplicatedLayout._id,
    });

    if (duplicatedLayout.isTranslationEnabled) {
      await this.duplicateTranslationsForLayout({
        sourceResourceId: originalLayout.layoutId,
        targetResourceId: duplicatedLayout.layoutId,
        command,
      });
    }

    return duplicatedLayout;
  }

  private async duplicateTranslationsForLayout({
    sourceResourceId,
    targetResourceId,
    command,
  }: {
    sourceResourceId: string;
    targetResourceId: string;
    command: DuplicateLayoutCommand;
  }) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const duplicateLocales = this.moduleRef.get(require('@novu/ee-translation')?.DuplicateLocales, {
        strict: false,
      });

      await duplicateLocales.execute({
        sourceResourceId,
        sourceResourceType: LocalizationResourceEnum.LAYOUT,
        targetResourceId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      });
    } catch (error) {
      this.logger.error(`Failed to duplicate translations for layout`, {
        sourceResourceId,
        targetResourceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
