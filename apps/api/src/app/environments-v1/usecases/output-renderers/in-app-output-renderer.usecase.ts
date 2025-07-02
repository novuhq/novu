import { InAppRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InstrumentUsecase, sanitizeHtmlInObject, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { RenderCommand } from './render-command';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';

export class InAppOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class InAppOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    protected featureFlagsService: FeatureFlagsService
  ) {
    super(moduleRef, logger, featureFlagsService);
  }

  @InstrumentUsecase()
  async execute(renderCommand: InAppOutputRendererCommand): Promise<InAppRenderOutput> {
    const { skip, disableOutputSanitization, ...outputControls } = renderCommand.controlValues ?? {};
    const { _environmentId, _organizationId, _id: workflowId } = renderCommand.dbWorkflow;

    const translatedControls = await this.processTranslations({
      controls: outputControls,
      variables: renderCommand.fullPayloadForRender,
      environmentId: _environmentId,
      organizationId: _organizationId,
      workflowId,
      locale: renderCommand.locale,
    });

    if (disableOutputSanitization) {
      return translatedControls as any;
    }

    const { data, ...restOutputControls } = translatedControls;

    return {
      ...sanitizeHtmlInObject(restOutputControls),
      ...(data ? { data } : {}),
    } as any;
  }
}
