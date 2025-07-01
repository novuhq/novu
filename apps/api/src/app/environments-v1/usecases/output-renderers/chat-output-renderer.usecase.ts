import { ChatRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InstrumentUsecase, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { RenderCommand } from './render-command';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';

export class ChatOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class ChatOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger
  ) {
    super(moduleRef, logger, featureFlagsService);
  }

  @InstrumentUsecase()
  async execute(renderCommand: ChatOutputRendererCommand): Promise<ChatRenderOutput> {
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
