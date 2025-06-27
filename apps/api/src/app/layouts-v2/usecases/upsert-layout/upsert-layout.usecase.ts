import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  InstrumentUsecase,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
  GetLayoutCommand,
  GetLayoutUseCase,
} from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  LAYOUT_CONTENT_VARIABLE,
  ResourceOriginEnum,
  ResourceTypeEnum,
  slugify,
} from '@novu/shared';

import { LayoutResponseDto } from '../../dtos';
import { UpsertLayoutCommand } from './upsert-layout.command';
import { hasMailyVariable, isStringifiedMailyJSONContent } from '../../../shared/helpers/maily-utils';
import {
  CreateLayoutCommand,
  CreateLayoutUseCase,
  UpdateLayoutCommand,
  UpdateLayoutUseCase,
} from '../../../layouts-v1/usecases';
import { mapToResponseDto } from '../mapper';
import { LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { LayoutVariablesSchemaCommand } from '../layout-variables-schema/layout-variables-schema.command';
import { LayoutDto } from '../../../layouts-v1/dtos';

@Injectable()
export class UpsertLayoutUseCase {
  constructor(
    private getLayoutUseCaseV0: GetLayoutUseCase,
    private createLayoutUseCaseV0: CreateLayoutUseCase,
    private updateLayoutUseCaseV0: UpdateLayoutUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private layoutVariablesSchemaUseCase: LayoutVariablesSchemaUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertLayoutCommand): Promise<LayoutResponseDto> {
    this.validateLayout(command);

    const existingLayout = command.layoutIdOrInternalId
      ? await this.getLayoutUseCaseV0.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: command.layoutIdOrInternalId,
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            type: ResourceTypeEnum.BRIDGE,
            origin: ResourceOriginEnum.NOVU_CLOUD,
          })
        )
      : null;

    let upsertedLayout: LayoutDto;
    if (existingLayout) {
      this.mixpanelTrack(command, 'Layout Update - [Layouts]');

      upsertedLayout = await this.updateLayoutUseCaseV0.execute(
        UpdateLayoutCommand.create({
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
          userId: command.user._id,
          layoutId: existingLayout._id!,
          name: command.layoutDto.name,
          type: existingLayout.type ?? ResourceTypeEnum.BRIDGE,
          origin: existingLayout.origin ?? ResourceOriginEnum.NOVU_CLOUD,
        })
      );
    } else {
      this.mixpanelTrack(command, 'Layout Create - [Layouts]');

      const defaultLayout = await this.layoutRepository.findOne({
        _organizationId: command.user.organizationId,
        _environmentId: command.user.environmentId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        isDefault: true,
      });

      upsertedLayout = await this.createLayoutUseCaseV0.execute(
        CreateLayoutCommand.create({
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
          userId: command.user._id,
          name: command.layoutDto.name,
          identifier: slugify(command.layoutDto.name),
          type: ResourceTypeEnum.BRIDGE,
          origin: ResourceOriginEnum.NOVU_CLOUD,
          isDefault: !defaultLayout,
        })
      );
    }

    const upsertedControlValues = await this.upsertControlValues(command, upsertedLayout._id!);

    const layoutVariablesSchema = await this.layoutVariablesSchemaUseCase.execute(
      LayoutVariablesSchemaCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
      })
    );

    return mapToResponseDto({
      layout: upsertedLayout,
      controlValues: upsertedControlValues?.controls ?? {},
      variables: layoutVariablesSchema,
    });
  }

  private validateLayout(command: UpsertLayoutCommand) {
    if (command.layoutDto.controlValues?.email) {
      const { content, editorType } = command.layoutDto.controlValues.email;
      const isMailyContent = isStringifiedMailyJSONContent(content);
      const isHtmlContent =
        content.includes('<html') &&
        content.includes('</html>') &&
        content.includes('<body') &&
        content.includes('</body>');

      if (!isMailyContent && !isHtmlContent) {
        throw new BadRequestException(
          editorType === 'html' ? 'Content must be a valid HTML content' : 'Content must be a valid Maily JSON content'
        );
      }

      if (editorType === 'html' && !isHtmlContent) {
        throw new BadRequestException('Content must be a valid HTML content');
      } else if (editorType === 'block' && !isMailyContent) {
        throw new BadRequestException('Content must be a valid Maily JSON content');
      }

      if (
        (isMailyContent && !hasMailyVariable(content, LAYOUT_CONTENT_VARIABLE)) ||
        (isHtmlContent && !this.hasHtmlVariable(content, LAYOUT_CONTENT_VARIABLE))
      ) {
        throw new BadRequestException('The layout body should contain the "content" variable');
      }
    }
  }

  private async upsertControlValues(command: UpsertLayoutCommand, layoutId: string) {
    const {
      layoutDto: { controlValues },
    } = command;
    const shouldDelete = controlValues === null;

    if (shouldDelete) {
      this.controlValuesRepository.delete({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _layoutId: layoutId,
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });

      return null;
    }

    return this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        layoutId,
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        newControlValues: controlValues as unknown as Record<string, unknown>,
      })
    );
  }

  private mixpanelTrack(command: UpsertLayoutCommand, eventName: string) {
    this.analyticsService.mixpanelTrack(eventName, command.user?._id, {
      _organization: command.user.organizationId,
      name: command.layoutDto.name,
      source: command.layoutDto.__source,
    });
  }

  private hasHtmlVariable(content: string, variable: string): boolean {
    const liquidVariableRegex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');

    return liquidVariableRegex.test(content);
  }
}
