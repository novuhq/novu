import { Injectable } from '@nestjs/common';
import {
  GetLayoutCommand as GetLayoutCommandV1,
  GetLayoutUseCase as GetLayoutUseCaseV1,
  AnalyticsService,
} from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum, slugify } from '@novu/shared';

import { DuplicateLayoutCommand } from './duplicate-layout.command';
import { LayoutResponseDto } from '../../dtos';
import { UpsertLayoutCommand, UpsertLayoutUseCase } from '../upsert-layout';

@Injectable()
export class DuplicateLayoutUseCase {
  constructor(
    private getLayoutUseCaseV1: GetLayoutUseCaseV1,
    private upsertLayoutUseCase: UpsertLayoutUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: DuplicateLayoutCommand): Promise<LayoutResponseDto> {
    const originalLayout = await this.getLayoutUseCaseV1.execute(
      GetLayoutCommandV1.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      })
    );

    const originalControlValues = await this.controlValuesRepository.findOne({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _layoutId: originalLayout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    const duplicatedLayout = await this.upsertLayoutUseCase.execute(
      UpsertLayoutCommand.create({
        layoutDto: {
          name: command.overrides.name,
          controlValues: originalControlValues?.controls ?? null,
        },
        user: command.user,
      })
    );

    this.analyticsService.track('Duplicate layout - [Layouts]', command.user._id, {
      _organizationId: command.user.organizationId,
      _environmentId: command.user.environmentId,
      originalLayoutId: originalLayout._id!,
      duplicatedLayoutId: duplicatedLayout._id,
    });

    return duplicatedLayout;
  }
}
