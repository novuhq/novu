import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { CreateLayoutCommand } from './create-layout.command';

import { LayoutDto } from '../../dtos/layout.dto';
import { ChannelTypeEnum, IEmailBlock } from '../../types';

@Injectable()
export class CreateLayoutUseCase {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: CreateLayoutCommand) {
    const entity = this.mapToEntity(command);

    const layout = await this.layoutRepository.createLayout(entity);

    return this.mapFromEntity(layout);
  }

  private mapToEntity(domainEntity: CreateLayoutCommand): Omit<LayoutEntity, '_id'> {
    return {
      _environmentId: LayoutRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: LayoutRepository.convertStringToObjectId(domainEntity.organizationId),
      _creatorId: domainEntity.userId,
      channel: ChannelTypeEnum.EMAIL,
      content: domainEntity.content,
      contentType: 'customHtml',
      name: domainEntity.name,
      variables: domainEntity.variables,
      isDefault: domainEntity.isDefault ?? false,
      isDeleted: false,
    };
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: LayoutRepository.convertObjectIdToString(layout._id),
      _organizationId: LayoutRepository.convertObjectIdToString(layout._organizationId),
      _environmentId: LayoutRepository.convertObjectIdToString(layout._environmentId),
    };
  }
}
