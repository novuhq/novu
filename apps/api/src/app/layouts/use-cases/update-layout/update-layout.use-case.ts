import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { UpdateLayoutCommand } from './update-layout.command';

import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { LayoutDto } from '../../dtos/layout.dto';
import { ChannelTypeEnum, IEmailBlock } from '../../types';

@Injectable()
export class UpdateLayoutUseCase {
  constructor(private getLayoutUseCase: GetLayoutUseCase, private layoutRepository: LayoutRepository) {}

  async execute(command: UpdateLayoutCommand) {
    const getLayoutCommand = GetLayoutCommand.create({
      layoutId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
    const databaseEntity = await this.getLayoutUseCase.execute(getLayoutCommand);
    const databaseLayout = this.mapToEntity(databaseEntity);

    const patchedEntity = this.applyUpdatesToEntity(this.mapToEntity(databaseEntity), command);

    const updatedEntity = await this.layoutRepository.updateLayout(patchedEntity);

    return this.mapFromEntity(updatedEntity);
  }

  private applyUpdatesToEntity(layout: LayoutEntity, updates: UpdateLayoutCommand): LayoutEntity {
    return {
      ...layout,
      ...(updates.name && { name: updates.name }),
      ...(updates.description && { description: updates.description }),
      ...(updates.content && { content: updates.content }),
      ...(updates.variables && { variables: updates.variables }),
      ...(typeof updates.isDefault === 'boolean' && { isDefault: updates.isDefault }),
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

  private mapToEntity(layout: LayoutDto): LayoutEntity {
    return {
      ...layout,
      _id: LayoutRepository.convertStringToObjectId(layout._id),
      _organizationId: LayoutRepository.convertStringToObjectId(layout._organizationId),
      _environmentId: LayoutRepository.convertStringToObjectId(layout._environmentId),
      contentType: 'customHtml',
      deleted: layout.isDeleted,
    };
  }
}
