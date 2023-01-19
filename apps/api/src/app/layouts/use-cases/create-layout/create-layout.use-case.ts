import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { CreateLayoutCommand } from './create-layout.command';

import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos';
import { ChannelTypeEnum, ITemplateVariable } from '../../types';
import { ContentService } from '../../../shared/helpers/content.service';
import { isReservedVariableName } from '@novu/shared';

@Injectable()
export class CreateLayoutUseCase {
  constructor(private setDefaultLayout: SetDefaultLayoutUseCase, private layoutRepository: LayoutRepository) {}

  async execute(command: CreateLayoutCommand): Promise<LayoutDto> {
    const variables = this.getExtractedVariables(command.variables as ITemplateVariable[], command.content);

    const entity = this.mapToEntity({ ...command, variables });

    const layout = await this.layoutRepository.createLayout(entity);

    const dto = this.mapFromEntity(layout);

    if (dto._id && dto.isDefault === true) {
      const setDefaultLayoutCommand = SetDefaultLayoutCommand.create({
        environmentId: dto._environmentId,
        layoutId: dto._id,
        organizationId: dto._organizationId,
        userId: dto._creatorId,
      });
      await this.setDefaultLayout.execute(setDefaultLayoutCommand);
    }

    return dto;
  }

  private mapToEntity(domainEntity: CreateLayoutCommand): Omit<LayoutEntity, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      _environmentId: LayoutRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: LayoutRepository.convertStringToObjectId(domainEntity.organizationId),
      _creatorId: domainEntity.userId,
      channel: ChannelTypeEnum.EMAIL,
      content: domainEntity.content,
      contentType: 'customHtml',
      description: domainEntity.description,
      name: domainEntity.name,
      variables: domainEntity.variables,
      isDefault: domainEntity.isDefault ?? false,
      deleted: false,
    };
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: LayoutRepository.convertObjectIdToString(layout._id),
      _organizationId: LayoutRepository.convertObjectIdToString(layout._organizationId),
      _environmentId: LayoutRepository.convertObjectIdToString(layout._environmentId),
      isDeleted: layout.deleted,
    };
  }

  private getExtractedVariables(variables: ITemplateVariable[], content: string): ITemplateVariable[] {
    const contentService = new ContentService();
    const extractedVariables = contentService
      .extractVariables(content)
      .filter((item) => !isReservedVariableName(item.name)) as ITemplateVariable[];

    if (!variables || variables.length === 0) {
      return extractedVariables;
    }

    return extractedVariables.map((variable) => {
      const { name, type, defaultValue, required } = variable;
      const variableFromRequest = variables.find((item) => item.name === name);

      return {
        name,
        type,
        defaultValue: variableFromRequest?.defaultValue ?? defaultValue,
        required: variableFromRequest?.required ?? required,
      };
    });
  }
}
