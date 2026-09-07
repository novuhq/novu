import { Injectable } from '@nestjs/common';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { LayoutResponseDto } from '../../dtos/layout/layout-response.dto';
import { GetLayoutCommandV0, GetLayoutUseCaseV0 } from '../get-layout-v0';
import { LayoutVariablesSchemaCommand, LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { GetLayoutCommand } from './get-layout.command';
import { mapLayoutToResponseDto } from './mapper';

@Injectable()
export class GetLayoutUseCase {
  constructor(
    private getLayoutUseCaseV1: GetLayoutUseCaseV0,
    private controlValuesRepository: ControlValuesRepository,
    private layoutVariablesSchemaUseCase: LayoutVariablesSchemaUseCase
  ) {}

  async execute(command: GetLayoutCommand): Promise<LayoutResponseDto> {
    const layout = await this.getLayoutUseCaseV1.execute(
      GetLayoutCommandV0.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      })
    );

    if (command.skipAdditionalFields) {
      return mapLayoutToResponseDto({
        layout,
      });
    }

    const controlValues = await this.controlValuesRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _layoutId: layout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    const layoutVariablesSchema = await this.layoutVariablesSchemaUseCase.execute(
      LayoutVariablesSchemaCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        controlValues: controlValues?.controls ?? {},
      })
    );

    return mapLayoutToResponseDto({
      layout,
      controlValues: controlValues?.controls ?? null,
      variables: layoutVariablesSchema,
    });
  }
}
