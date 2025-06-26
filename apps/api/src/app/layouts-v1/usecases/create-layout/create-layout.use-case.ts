import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';

import { ControlSchemas, LayoutEntity, LayoutRepository } from '@novu/dal';
import { isReservedVariableName, ResourceTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { AnalyticsService, ContentService, layoutControlSchema, layoutUiSchema } from '@novu/application-generic';

import { CreateLayoutCommand } from './create-layout.command';
import { CreateLayoutChangeCommand, CreateLayoutChangeUseCase } from '../create-layout-change';
import { SetDefaultLayoutCommand, SetDefaultLayoutUseCase } from '../set-default-layout';
import { LayoutDto } from '../../dtos';
import { ChannelTypeEnum, ITemplateVariable, LayoutId } from '../../types';

@Injectable()
export class CreateLayoutUseCase {
  constructor(
    private createLayoutChange: CreateLayoutChangeUseCase,
    private setDefaultLayout: SetDefaultLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateLayoutCommand): Promise<LayoutDto & { _id: string }> {
    const isV2Layout =
      command.origin === ResourceOriginEnum.NOVU_CLOUD || command.origin === ResourceOriginEnum.EXTERNAL;
    const variables = this.getExtractedVariables(command.variables as ITemplateVariable[], command.content ?? '');
    const hasBody = command.content?.includes('{{{body}}}');
    if (!hasBody && !isV2Layout) {
      throw new BadRequestException('Layout content must contain {{{body}}}');
    }
    const layoutIdentifierExist = await this.layoutRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      identifier: command.identifier,
      ...(isV2Layout ? { type: command.type, origin: command.origin } : {}),
    });
    if (layoutIdentifierExist) {
      throw new ConflictException(
        `Layout with identifier: ${command.identifier} already exists under environment ${command.environmentId}`
      );
    }
    let entity = this.mapToEntity({ ...command, contentType: 'customHtml', variables });
    if (isV2Layout) {
      entity = this.mapToEntity({
        ...command,
        controls: { schema: layoutControlSchema, uiSchema: layoutUiSchema },
        contentType: undefined,
        type: command.type,
        origin: command.origin,
      });
    }

    const layout = await this.layoutRepository.createLayout(entity);
    const dto = this.mapFromEntity(layout);

    if (dto._id && dto.isDefault) {
      const setDefaultLayoutCommand = SetDefaultLayoutCommand.create({
        environmentId: dto._environmentId,
        layoutId: dto._id,
        organizationId: dto._organizationId,
        userId: dto._creatorId,
        type: dto.type,
        origin: dto.origin,
      });
      await this.setDefaultLayout.execute(setDefaultLayoutCommand);
    } else if (!isV2Layout) {
      await this.createChange(command, dto._id);
    }

    this.analyticsService.track('[Layout] - Create', command.userId, {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      layoutId: dto._id,
    });

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

  private mapToEntity(
    domainEntity: CreateLayoutCommand & { controls?: ControlSchemas; contentType?: 'customHtml' }
  ): Omit<LayoutEntity, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      _environmentId: domainEntity.environmentId,
      _organizationId: domainEntity.organizationId,
      _creatorId: domainEntity.userId,
      channel: ChannelTypeEnum.EMAIL,
      content: domainEntity.content,
      contentType: domainEntity.contentType,
      description: domainEntity.description,
      name: domainEntity.name,
      identifier: domainEntity.identifier,
      variables: domainEntity.variables,
      isDefault: domainEntity.isDefault ?? false,
      type: domainEntity.type,
      origin: domainEntity.origin,
      deleted: false,
      controls: domainEntity.controls,
    };
  }

  private mapFromEntity(layout: LayoutEntity): LayoutDto & { _id: string } {
    return {
      ...layout,
      _id: layout._id,
      _organizationId: layout._organizationId,
      _environmentId: layout._environmentId,
      isDeleted: layout.deleted,
      controls: {
        uiSchema: layout.controls?.uiSchema,
        dataSchema: layout.controls?.schema,
      },
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
