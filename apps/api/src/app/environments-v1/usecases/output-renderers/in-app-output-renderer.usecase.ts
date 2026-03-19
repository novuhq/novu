import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InstrumentUsecase, PinoLogger, sanitizeHtmlInObject } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { InAppRenderOutput } from '@novu/shared';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { RenderCommand } from './render-command';

export class InAppOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class InAppOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger
  ) {
    super(moduleRef, logger);
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
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: renderCommand.locale,
      resourceEntity: renderCommand.dbWorkflow,
      organization: renderCommand.organization,
    });

    if (disableOutputSanitization) {
      return translatedControls as any;
    }

    const { data, ...restOutputControls } = translatedControls;

    const sanitized = sanitizeHtmlInObject(restOutputControls);

    const { body, subject, ...otherSanitizedControls } = sanitized;

    /**
     * We need to remove the subject and body from the output if they are empty.
     * Otherwise, the ajv anyOf validation will fail as it will try to make the minLength validation.
     */
    return {
      ...otherSanitizedControls,
      ...(subject && typeof subject === 'string' && subject.length > 0 ? { subject } : {}),
      ...(body && typeof body === 'string' && body.length > 0 ? { body } : {}),
      ...(data ? { data } : {}),
    } as any;
  }
}
