import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { ToolRenderOutput } from '@novu/shared';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { RenderCommand } from './render-command';

export class ToolOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class ToolOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger
  ) {
    super(moduleRef, logger);
  }

  @InstrumentUsecase()
  async execute(renderCommand: ToolOutputRendererCommand): Promise<ToolRenderOutput> {
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
      resourceEntity: renderCommand.dbWorkflow,
      organization: renderCommand.organization,
    });

    const output: ToolRenderOutput = {
      body: (translatedControls.body as string) ?? '',
    };

    if (translatedControls.enabledIntegrations !== undefined) {
      output.enabledIntegrations = translatedControls.enabledIntegrations as string[];
    }

    if (translatedControls.providerOverrides !== undefined) {
      output.providerOverrides = translatedControls.providerOverrides as ToolRenderOutput['providerOverrides'];
    }

    return output;
  }
}
