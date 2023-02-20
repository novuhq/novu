import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { UpdateLayoutCommand } from './update-layout.command';

import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos/layout.dto';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private createLayoutChange: CreateLayoutChangeUseCase,
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

    if (typeof command.isDefault === 'boolean' && !command.isDefault && databaseEntity.isDefault) {
      throw new ConflictException(`One default layout is required`);
    }

    const patchedEntity = this.applyUpdatesToEntity(this.mapToEntity(databaseEntity), command);
    const hasBody = patchedEntity.content.includes('{{{body}}}');
    if (!hasBody) {
      throw new ApiException('Layout content must contain {{{body}}}');
    }

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
    } else {
      await this.createChange(command);
    }

    return dto;
  }

  private async createChange(command: UpdateLayoutCommand): Promise<void> {
    const createLayoutChangeCommand = CreateLayoutChangeCommand.create({
      environmentId: command.environmentId,
      layoutId: command.layoutId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    await this.createLayoutChange.execute(createLayoutChangeCommand);
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
