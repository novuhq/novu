import { BadRequestException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AnalyticsService,
  GetLayoutCommand,
  GetLayoutCommandV0,
  GetLayoutUseCase,
  GetLayoutUseCaseV0,
  InstrumentUsecase,
  isStringifiedMailyJSONContent,
  LayoutDtoV0,
  LayoutResponseDto,
  layoutControlSchema,
  PinoLogger,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository, LocalizationResourceEnum } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  LayoutControlValuesDto,
  ResourceOriginEnum,
  ResourceTypeEnum,
  slugify,
} from '@novu/shared';
import {
  CreateLayoutCommand,
  CreateLayoutUseCase,
  UpdateLayoutCommand,
  UpdateLayoutUseCase,
} from '../../../layouts-v1/usecases';
import { MANAGE_TRANSLATIONS } from '../../../shared/constants';
import { BuildLayoutIssuesCommand } from '../build-layout-issues/build-layout-issues.command';
import { BuildLayoutIssuesUsecase } from '../build-layout-issues/build-layout-issues.usecase';
import { UpsertLayoutCommand } from './upsert-layout.command';

@Injectable()
export class UpsertLayout {
  constructor(
    private getLayoutUseCaseV0: GetLayoutUseCaseV0,
    private createLayoutUseCaseV0: CreateLayoutUseCase,
    private updateLayoutUseCaseV0: UpdateLayoutUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private layoutRepository: LayoutRepository,
    private analyticsService: AnalyticsService,
    private buildLayoutIssuesUsecase: BuildLayoutIssuesUsecase,
    private getLayoutUseCase: GetLayoutUseCase,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
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
          GetLayoutCommandV0.create({
            layoutIdOrInternalId: command.layoutIdOrInternalId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            type: ResourceTypeEnum.BRIDGE,
            origin: ResourceOriginEnum.NOVU_CLOUD,
          })
        )
      : null;

    let upsertedLayout: LayoutDtoV0;
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
          identifier: command.layoutDto.layoutId || slugify(command.layoutDto.name),
          type: ResourceTypeEnum.BRIDGE,
          origin: ResourceOriginEnum.NOVU_CLOUD,
          isDefault: !defaultLayout,
        })
      );
    }

    await this.toggleTranslationsForLayout(command, upsertedLayout);

    await this.upsertControlValues(command, upsertedLayout._id!);

    return await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId: upsertedLayout.identifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );
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
      throw new BadRequestException({ message: 'Layout has validation issues', ...issues });
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

  private async toggleTranslationsForLayout(command: UpsertLayoutCommand, layoutDto: LayoutDtoV0) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const manageTranslations = this.moduleRef.get(MANAGE_TRANSLATIONS, {
        strict: false,
      });

      await manageTranslations.execute({
        enabled: command.layoutDto.isTranslationEnabled,
        resourceId: layoutDto.identifier,
        resourceType: LocalizationResourceEnum.LAYOUT,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        resourceEntity: layoutDto,
      });
    } catch (error) {
      this.logger.error(
        `Failed to ${command.layoutDto.isTranslationEnabled ? 'enable' : 'disable'} translations for layout`,
        {
          layoutId: layoutDto.identifier,
          enabled: command.layoutDto.isTranslationEnabled,
          organizationId: command.organizationId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw error;
    }
  }
}
