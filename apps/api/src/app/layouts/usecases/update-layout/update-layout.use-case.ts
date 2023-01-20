import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { UpdateLayoutCommand } from './update-layout.command';

import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos/layout.dto';

@Injectable()
export class UpdateLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private setDefaultLayout: SetDefaultLayoutUseCase,
    private layoutRepository: LayoutRepository
  ) {}

  async execute(command: UpdateLayoutCommand): Promise<LayoutDto> {
    const getLayoutCommand = GetLayoutCommand.create({
      layoutId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
    const databaseEntity = await this.getLayoutUseCase.execute(getLayoutCommand);

    const patchedEntity = this.applyUpdatesToEntity(this.mapToEntity(databaseEntity), command);

    const updatedEntity = await this.layoutRepository.updateLayout(patchedEntity);

    const dto = this.mapFromEntity(updatedEntity);

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
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      isDeleted: layout.deleted,
    };
  }

  private mapToEntity(layout: LayoutDto): LayoutEntity {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      contentType: 'customHtml',
      deleted: layout.isDeleted,
    };
  }
}
