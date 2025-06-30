import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  GetLayoutCommand as GetLayoutCommandV1,
  GetLayoutUseCase as GetLayoutUseCaseV1,
} from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { GetLayoutCommand } from './get-layout.command';
import { LayoutResponseDto } from '../../dtos';
import { mapToResponseDto } from '../mapper';
import { LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { LayoutVariablesSchemaCommand } from '../layout-variables-schema/layout-variables-schema.command';

@Injectable()
export class GetLayoutUseCase {
  constructor(
    private getLayoutUseCaseV1: GetLayoutUseCaseV1,
    private controlValuesRepository: ControlValuesRepository,
    private layoutVariablesSchemaUseCase: LayoutVariablesSchemaUseCase,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetLayoutCommand): Promise<LayoutResponseDto> {
    const layout = await this.getLayoutUseCaseV1.execute(
      GetLayoutCommandV1.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      })
    );

    const controlValues = await this.controlValuesRepository.findOne({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _layoutId: layout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    const layoutVariablesSchema = await this.layoutVariablesSchemaUseCase.execute(
      LayoutVariablesSchemaCommand.create({
        user: command.user,
      })
    );

    this.analyticsService.track('Get layout - [Layouts]', command.user._id, {
      _organizationId: command.user.organizationId,
      _environmentId: command.user.environmentId,
      layoutId: layout._id!,
    });

    return mapToResponseDto({
      layout,
      controlValues: controlValues?.controls ?? null,
      variables: layoutVariablesSchema,
    });
  }
}
