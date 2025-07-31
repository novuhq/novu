import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  GetLayoutCommand,
  GetLayoutUseCase,
  InstrumentUsecase,
  layoutControlSchema,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  LayoutControlValuesDto,
  ResourceOriginEnum,
  ResourceTypeEnum,
  slugify,
} from '@novu/shared';
import { LayoutDto } from '../../../layouts-v1/dtos';
import {
  CreateLayoutCommand,
  CreateLayoutUseCase,
  UpdateLayoutCommand,
  UpdateLayoutUseCase,
} from '../../../layouts-v1/usecases';
import { isStringifiedMailyJSONContent } from '../../../shared/helpers/maily-utils';
import { LayoutResponseDto } from '../../dtos';
import { BuildLayoutIssuesCommand } from '../build-layout-issues/build-layout-issues.command';
import { BuildLayoutIssuesUsecase } from '../build-layout-issues/build-layout-issues.usecase';
import { LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { LayoutVariablesSchemaCommand } from '../layout-variables-schema/layout-variables-schema.command';
import { mapToResponseDto } from '../mapper';
import { UpsertLayoutCommand } from './upsert-layout.command';

@Injectable()
export class UpsertLayout {
  constructor(
    private getLayoutUseCaseV0: GetLayoutUseCase,
    private createLayoutUseCaseV0: CreateLayoutUseCase,
    private updateLayoutUseCaseV0: UpdateLayoutUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private layoutVariablesSchemaUseCase: LayoutVariablesSchemaUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService,
    private buildLayoutIssuesUsecase: BuildLayoutIssuesUsecase
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertLayoutCommand): Promise<LayoutResponseDto> {
    const { controlValues } = command.layoutDto;

    await this.validateLayout({
      command,
      controlValues,
    });

    const existingLayout = command.layoutIdOrInternalId
      ? await this.getLayoutUseCaseV0.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: command.layoutIdOrInternalId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
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
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          layoutId: existingLayout._id!,
          name: command.layoutDto.name,
          type: existingLayout.type ?? ResourceTypeEnum.BRIDGE,
          origin: existingLayout.origin ?? ResourceOriginEnum.NOVU_CLOUD,
        })
      );
    } else {
      this.mixpanelTrack(command, 'Layout Create - [Layouts]');

      const defaultLayout = await this.layoutRepository.findOne({
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        isDefault: true,
      });

      upsertedLayout = await this.createLayoutUseCaseV0.execute(
        CreateLayoutCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          name: command.layoutDto.name,
          identifier: command.preserveLayoutId ? (command.layoutDto.layoutId ?? '') : slugify(command.layoutDto.name),
          type: ResourceTypeEnum.BRIDGE,
          origin: ResourceOriginEnum.NOVU_CLOUD,
          isDefault: !defaultLayout,
        })
      );
    }

    const upsertedControlValues = await this.upsertControlValues(command, upsertedLayout._id!);

    const layoutVariablesSchema = await this.layoutVariablesSchemaUseCase.execute(
      LayoutVariablesSchemaCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        controlValues: (controlValues ?? {}) as Record<string, unknown>,
      })
    );

    return mapToResponseDto({
      layout: upsertedLayout,
      controlValues: upsertedControlValues?.controls ?? {},
      variables: layoutVariablesSchema,
    });
  }

  private async validateLayout({
    command,
    controlValues,
  }: {
    command: UpsertLayoutCommand;
    controlValues?: LayoutControlValuesDto | null;
  }) {
    if (!controlValues) {
      return;
    }

    if (controlValues.email) {
      const { body: content, editorType } = controlValues.email;
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
    }

    const issues = await this.buildLayoutIssuesUsecase.execute(
      BuildLayoutIssuesCommand.create({
        controlSchema: layoutControlSchema,
        controlValues,
        resourceOrigin: command.layoutDto.__source ? ResourceOriginEnum.NOVU_CLOUD : ResourceOriginEnum.EXTERNAL,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    if (Object.keys(issues).length > 0) {
      throw new BadRequestException(issues);
    }
  }

  private async upsertControlValues(command: UpsertLayoutCommand, layoutId: string) {
    const {
      layoutDto: { controlValues },
    } = command;
    const doNothing = typeof controlValues === 'undefined';
    if (doNothing) {
      return null;
    }

    const shouldDelete = controlValues === null;
    if (shouldDelete) {
      this.controlValuesRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _layoutId: layoutId,
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });

      return null;
    }

    return this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        layoutId,
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        newControlValues: controlValues as unknown as Record<string, unknown>,
      })
    );
  }

  private mixpanelTrack(command: UpsertLayoutCommand, eventName: string) {
    this.analyticsService.mixpanelTrack(eventName, command.userId, {
      _organization: command.organizationId,
      name: command.layoutDto.name,
      source: command.layoutDto.__source,
    });
  }
}
