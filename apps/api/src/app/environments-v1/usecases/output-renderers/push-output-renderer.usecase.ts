import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { PushRenderOutput } from '@novu/shared';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { ControlsTranslationService } from './controls-translation.service';
import { RenderCommand } from './render-command';

export class PushOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class PushOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(logger: PinoLogger, controlsTranslationService: ControlsTranslationService) {
    super(logger, controlsTranslationService);
    this.logger.setContext(this.constructor.name);
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
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: renderCommand.locale,
      organization: renderCommand.organization,
      resourceEntity: renderCommand.dbWorkflow,
    });

    return translatedControls as any;
  }
}
