import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { CreateLayoutCommand } from './create-layout.command';

import { LayoutDto } from '../../dtos/layout.dto';
import { ChannelTypeEnum, ITemplateVariable } from '../../types';
import { ContentService } from '../../../shared/helpers/content.service';

@Injectable()
export class CreateLayoutUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: CreateLayoutCommand) {
    const contentService = new ContentService();
    const extractedVariables = contentService.extractVariables(command.content);
    const variables = [
      ...new Map([...extractedVariables, ...(command.variables || [])].map((item) => [item.name, item])).values(),
    ] as ITemplateVariable[];

    const entity = this.mapToEntity({ ...command, variables });

    const layout = await this.layoutRepository.createLayout(entity);

    return this.mapFromEntity(layout);
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
}
