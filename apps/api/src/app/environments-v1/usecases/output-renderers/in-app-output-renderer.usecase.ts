import { InAppRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, sanitizeHTML } from '@novu/application-generic';
import { RenderCommand } from './render-command';

@Injectable()
export class InAppOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): InAppRenderOutput {
    const { skip, disableOutputSanitization, ...outputControls } = renderCommand.controlValues ?? {};

    if (disableOutputSanitization) {
      return outputControls as any;
    } else {
      const { subject, body, avatar, primaryAction, secondaryAction, data, redirect } = outputControls as any;

      return {
        subject: sanitizeHTML(subject),
        body: sanitizeHTML(body),
        avatar: sanitizeHTML(avatar),
        primaryAction: {
          label: sanitizeHTML(primaryAction.label),
          redirect: {
            url: sanitizeHTML(primaryAction.redirect.url),
            target: primaryAction.redirect.target,
          },
        },
        secondaryAction: {
          label: sanitizeHTML(secondaryAction.label),
          redirect: {
            url: sanitizeHTML(secondaryAction.redirect.url),
            target: secondaryAction.redirect.target,
          },
        },
        redirect: {
          url: sanitizeHTML(redirect.url),
          target: redirect.target,
        },
        data,
      };
    }
  }
}
