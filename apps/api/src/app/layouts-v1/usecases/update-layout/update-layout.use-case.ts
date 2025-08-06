import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AnalyticsService, GetLayoutCommand, GetLayoutUseCase, layoutControlSchema } from '@novu/application-generic';
import { LayoutEntity, LayoutRepository } from '@novu/dal';
import { ResourceOriginEnum } from '@novu/shared';
import { LayoutDto } from '../../dtos/layout.dto';
import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { UpdateLayoutCommand } from './update-layout.command';

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
    const isV2Layout =
      command.origin === ResourceOriginEnum.NOVU_CLOUD || command.origin === ResourceOriginEnum.EXTERNAL;
    const getLayoutCommand = GetLayoutCommand.create({
      layoutIdOrInternalId: command.layoutId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      type: command.type,
      origin: command.origin,
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
    const hasBody = patchedEntity.content?.includes('{{{body}}}');
    if (!hasBody && !isV2Layout) {
      throw new BadRequestException('Layout content must contain {{{body}}}');
    }

    const updatedEntity = await this.layoutRepository.updateLayout(patchedEntity);

    const dto = this.mapFromEntity(updatedEntity);

    if (dto._id && dto.isDefault === true) {
      const setDefaultLayoutCommand = SetDefaultLayoutCommand.create({
        environmentId: dto._environmentId,
        layoutId: dto._id,
        organizationId: dto._organizationId,
        userId: dto._creatorId,
        type: dto.type,
        origin: dto.origin,
      });
      await this.setDefaultLayout.execute(setDefaultLayoutCommand);
    } else {
      await this.createChange(command, isV2Layout);
    }

    this.analyticsService.track('[Layout] - Update', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      layoutId: dto._id,
    });

    return dto;
  }

  private async createChange(command: UpdateLayoutCommand, isV2Layout: boolean): Promise<void> {
    if (isV2Layout) {
      return;
    }

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
      _updatedBy: updates.userId,
    };
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      isDeleted: layout.deleted,
      controls: {
        dataSchema: layout.controls?.schema,
        uiSchema: layout.controls?.uiSchema,
      },
    };
  }

  private mapToEntity(layout: LayoutDto): LayoutEntity {
    return {
      ...layout,
      _id: layout._id as string,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      contentType: layout.contentType ? 'customHtml' : undefined,
      deleted: layout.isDeleted,
      controls: {
        schema: layout.controls?.dataSchema ?? layoutControlSchema,
        uiSchema: layout.controls?.uiSchema,
      },
    };
  }
}
