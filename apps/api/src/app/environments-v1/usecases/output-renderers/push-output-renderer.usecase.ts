import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PushRenderOutput } from '@novu/shared';
import { InstrumentUsecase, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { RenderCommand } from './render-command';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';

export class PushOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class PushOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    protected featureFlagsService: FeatureFlagsService
  ) {
    super(moduleRef, logger, featureFlagsService);
  }

  @InstrumentUsecase()
  async execute(renderCommand: PushOutputRendererCommand): Promise<PushRenderOutput> {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};
    const { _environmentId, _organizationId, _id: workflowId } = renderCommand.dbWorkflow;

    const translatedControls = await this.processTranslations({
      controls: outputControls,
      variables: renderCommand.fullPayloadForRender,
      environmentId: _environmentId,
      organizationId: _organizationId,
      workflowId,
      locale: renderCommand.locale,
    });

    return translatedControls as any;
  }
}
