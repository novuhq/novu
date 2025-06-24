import { Injectable } from '@nestjs/common';
import {
  ChannelTypeEnum,
  ControlValuesLevelEnum,
  EmailRenderOutput,
  FeatureFlagsKeysEnum,
  LAYOUT_CONTENT_VARIABLE,
  ResourceOriginEnum,
  ResourceTypeEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  sanitizeHTML,
  FeatureFlagsService,
  LayoutControlType,
  EmailControlType,
} from '@novu/application-generic';
import { ControlValuesEntity, ControlValuesRepository, LayoutRepository } from '@novu/dal';

import { FullPayloadForRender, RenderCommand } from './render-command';
import { HtmlRendererUseCase } from '../html-renderer/html-renderer.usecase';
import { HtmlRendererCommand } from '../html-renderer/html-renderer.command';
import { removeBrandingFromHtml } from '../../../shared/utils/html';

export class EmailOutputRendererCommand extends RenderCommand {
  environmentId: string;
  organizationId: string;
}

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(
    private htmlRendererUseCase: HtmlRendererUseCase,
    private featureFlagService: FeatureFlagsService,
    private controlValuesRepository: ControlValuesRepository,
    private layoutRepository: LayoutRepository
  ) {}

  @InstrumentUsecase()
  async execute(renderCommand: EmailOutputRendererCommand): Promise<EmailRenderOutput> {
    const {
      body,
      subject: controlSubject,
      disableOutputSanitization,
      layoutId,
    } = renderCommand.controlValues as EmailControlType;

    if (!body || typeof body !== 'string') {
      /**
       * Force type mapping in case undefined control.
       * This passes responsibility to framework to throw type validation exceptions
       * rather than handling invalid types here.
       */
      return {
        subject: controlSubject as string,
        body: body as string,
      };
    }

    const isLayoutsPageActive = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_LAYOUTS_PAGE_ACTIVE,
      defaultValue: false,
      environment: { _id: renderCommand.environmentId },
      organization: { _id: renderCommand.organizationId },
    });

    let renderedHtml = '';
    if (isLayoutsPageActive) {
      const stepBodyHtml = await this.htmlRendererUseCase.execute(
        HtmlRendererCommand.create({
          content: body,
          environmentId: renderCommand.environmentId,
          organizationId: renderCommand.organizationId,
          disableOutputSanitization: !!disableOutputSanitization,
          payload: renderCommand.fullPayloadForRender,
          noHtmlWrappingTags: true,
        })
      );

      const cleanedStepBodyHtml = stepBodyHtml.replace(/<!DOCTYPE.*?>/, '').replace(/<!--\/$-->/, '');

      renderedHtml = await this.renderWithLayout({
        stepContent: cleanedStepBodyHtml,
        environmentId: renderCommand.environmentId,
        organizationId: renderCommand.organizationId,
        layoutId,
        disableOutputSanitization: !!disableOutputSanitization,
        payload: renderCommand.fullPayloadForRender,
      });
    } else {
      renderedHtml = await this.htmlRendererUseCase.execute(
        HtmlRendererCommand.create({
          content: body,
          environmentId: renderCommand.environmentId,
          organizationId: renderCommand.organizationId,
          disableOutputSanitization: !!disableOutputSanitization,
          payload: renderCommand.fullPayloadForRender,
        })
      );
    }

    /**
     * Force type mapping in case undefined control.
     * This passes responsibility to framework to throw type validation exceptions
     * rather than handling invalid types here.
     */
    const subject = controlSubject as string;

    if (disableOutputSanitization) {
      return { subject, body: renderedHtml };
    }

    return { subject: sanitizeHTML(subject), body: renderedHtml };
  }

  private async renderWithLayout({
    stepContent,
    environmentId,
    organizationId,
    disableOutputSanitization,
    layoutId,
    payload,
  }: {
    stepContent: string;
    environmentId: string;
    organizationId: string;
    disableOutputSanitization: boolean;
    layoutId?: string;
    payload: FullPayloadForRender;
  }): Promise<string> {
    let layoutControlsEntity: ControlValuesEntity | null = null;
    // if the step control values have a layoutId then find layout controls entity
    if (layoutId) {
      layoutControlsEntity = await this.controlValuesRepository.findOne({
        _organizationId: organizationId,
        _environmentId: environmentId,
        _layoutId: layoutId,
        level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
      });
    } else if (typeof layoutId === 'undefined') {
      // otherwise find the default layout controls
      const defaultEmailLayout = await this.layoutRepository.findOne({
        _organizationId: organizationId,
        _environmentId: environmentId,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        type: ResourceTypeEnum.BRIDGE,
        isDefault: true,
        channel: ChannelTypeEnum.EMAIL,
      });

      layoutControlsEntity = defaultEmailLayout
        ? await this.controlValuesRepository.findOne({
            _organizationId: organizationId,
            _environmentId: environmentId,
            _layoutId: defaultEmailLayout._id,
            level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
          })
        : null;
    }

    if (!layoutControlsEntity) {
      return stepContent;
    }

    const layoutControlValues = layoutControlsEntity.controls as LayoutControlType;

    return this.htmlRendererUseCase.execute(
      HtmlRendererCommand.create({
        content: layoutControlValues.email?.content ?? '',
        organizationId,
        environmentId,
        disableOutputSanitization,
        payload: {
          ...payload,
          [LAYOUT_CONTENT_VARIABLE]: removeBrandingFromHtml(stepContent.replace(/\n/g, '')),
        },
      })
    );
  }
}
