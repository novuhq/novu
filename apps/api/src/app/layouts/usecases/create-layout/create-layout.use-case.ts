import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import { isReservedVariableName } from '@novu/shared';

import { CreateLayoutCommand } from './create-layout.command';

import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos';
import { ChannelTypeEnum, ITemplateVariable, LayoutId } from '../../types';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ContentService } from '../../../shared/helpers/content.service';

@Injectable()
export class CreateLayoutUseCase {
  constructor(
    private createLayoutChange: CreateLayoutChangeUseCase,
    private setDefaultLayout: SetDefaultLayoutUseCase,
    private layoutRepository: LayoutRepository
  ) {}

  async execute(command: CreateLayoutCommand): Promise<LayoutDto> {
    const variables = this.getExtractedVariables(command.variables as ITemplateVariable[], command.content);
    const hasBody = command.content.includes('{{{body}}}');
    if (!hasBody) {
      throw new ApiException('Layout content must contain {{{body}}}');
    }
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
    } else {
      await this.createChange(command, dto._id);
    }

    return dto;
  }

  private async createChange(command: CreateLayoutCommand, layoutId: LayoutId): Promise<void> {
    const createLayoutChangeCommand = CreateLayoutChangeCommand.create({
      environmentId: command.environmentId,
      layoutId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    await this.createLayoutChange.execute(createLayoutChangeCommand);
  }

  private mapToEntity(domainEntity: CreateLayoutCommand): Omit<LayoutEntity, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      _environmentId: domainEntity.environmentId,
      _organizationId: domainEntity.organizationId,
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
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
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
