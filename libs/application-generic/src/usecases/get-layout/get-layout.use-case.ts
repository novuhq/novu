import { Injectable, NotFoundException } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { ITemplateVariable } from '@novu/shared';

import { GetLayoutCommand } from './get-layout.command';
import { LayoutDto } from './layout.dto';

@Injectable()
export class GetLayoutUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: GetLayoutCommand): Promise<LayoutDto> {
    let layout: LayoutEntity;
    if (typeof command.layoutIdOrInternalId === 'undefined') {
      layout = await this.layoutRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        isDefault: true,
        type: command.type,
        origin: command.origin,
      });
    } else if (LayoutRepository.isInternalId(command.layoutIdOrInternalId)) {
      layout = await this.layoutRepository.findOne({
        _id: command.layoutIdOrInternalId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        type: command.type,
        origin: command.origin,
      });
    } else {
      layout = await this.layoutRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.layoutIdOrInternalId,
        type: command.type,
        origin: command.origin,
      });
    }

    if (!layout) {
      throw new NotFoundException(
        command.layoutIdOrInternalId
          ? `Layout not found for id ${command.layoutIdOrInternalId} in the environment ${command.environmentId}`
          : `Default layout not found in the environment ${command.environmentId}`
      );
    }

    return this.mapFromEntity(layout);
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      variables: this.mapVariablesFromEntity(layout.variables),
      isDeleted: layout.deleted,
      controls: layout.controls
        ? {
            uiSchema: layout.controls.uiSchema,
            dataSchema: layout.controls.schema,
          }
        : undefined,
    };
  }

  private mapVariablesFromEntity(variables?: ITemplateVariable[]): ITemplateVariable[] {
    if (!variables || variables.length === 0) {
      return [];
    }

    return variables.map((variable) => {
      const { name, type, defaultValue, required } = variable;

      return {
        name,
        type,
        defaultValue,
        required,
      };
    });
  }
}
