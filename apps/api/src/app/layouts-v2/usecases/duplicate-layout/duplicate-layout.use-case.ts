import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { LayoutResponseDto } from '../../dtos';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { UpsertLayout, UpsertLayoutCommand } from '../upsert-layout';
import { DuplicateLayoutCommand } from './duplicate-layout.command';

@Injectable()
export class DuplicateLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private upsertLayoutUseCase: UpsertLayout,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService
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

    return duplicatedLayout;
  }
}
