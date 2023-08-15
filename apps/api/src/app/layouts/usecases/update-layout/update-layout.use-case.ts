import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { AnalyticsService, GetLayoutCommand, GetLayoutUseCase } from '@novu/application-generic';

import { UpdateLayoutCommand } from './update-layout.command';
import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos/layout.dto';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private createLayoutChange: CreateLayoutChangeUseCase,
    private setDefaultLayout: SetDefaultLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateLayoutCommand): Promise<LayoutDto> {
    const getLayoutCommand = GetLayoutCommand.create({
      layoutId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
    const databaseEntity = await this.getLayoutUseCase.execute(getLayoutCommand);

    const identifierHasChanged = command.identifier && command.identifier !== databaseEntity.identifier;
    if (identifierHasChanged) {
      const existingLayoutWithIdentifier = await this.layoutRepository.findOne({
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        identifier: command.identifier,
      });

      if (existingLayoutWithIdentifier) {
        throw new ConflictException(
          `Layout with identifier: ${command.identifier} already exists under environment ${command.environmentId}`
        );
      }
    }

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

    this.analyticsService.track('[Layout] - Update', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      layoutId: dto._id,
    });

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
      ...(updates.identifier && { identifier: updates.identifier }),
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
      _id: layout._id as string,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      contentType: 'customHtml',
      deleted: layout.isDeleted,
    };
  }
}
