import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SmsRenderOutput } from '@novu/shared';
import { InstrumentUsecase, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { RenderCommand } from './render-command';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';

export class SmsOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class SmsOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    protected featureFlagsService: FeatureFlagsService
  ) {
    super(moduleRef, logger, featureFlagsService);
  }

  @InstrumentUsecase()
  async execute(renderCommand: SmsOutputRendererCommand): Promise<SmsRenderOutput> {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};

    const translatedControls = await this.processTranslations(
      outputControls,
      renderCommand.fullPayloadForRender,
      renderCommand.dbWorkflow,
      renderCommand.locale
    );

    return translatedControls as any;
  }
}
