// Base interface for all renderers
import { render } from '@maily-to/render';
import {
  ChatRenderResult,
  EmailRenderResult,
  EmailStepControlSchema,
  InAppPreviewResultSchema,
  InAppRenderResult,
  PushRenderResult,
  RedirectTargetEnum,
  SmsRenderResult,
} from '@novu/shared-internal';
import { expendSchema } from '../render/email-schema-extender';

class RenderCommand {
  controlValues: Record<string, unknown>;
}

export class EmailOutputRendererUseCase {
  async execute(renderCommand: RenderCommand): Promise<EmailRenderResult> {
    const parse = EmailStepControlSchema.parse(renderCommand.controlValues);
    const expandedSchema = expendSchema(parse.emailEditor);
    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}

// Concrete Renderer for Chat Preview
export class ChatOutputRendererUseCase {
  execute(renderCommand: RenderCommand): ChatRenderResult {
    const body = (renderCommand.controlValues.body as string) || 'Default chat message';

    return { body };
  }
}

// Concrete Renderer for SMS Preview
export class SmsOutputRendererUseCase {
  execute(renderCommand: RenderCommand): SmsRenderResult {
    const body = (renderCommand.controlValues.body as string) || 'Default SMS message';

    return { body };
  }
}

// Concrete Renderer for Push Notification Preview
export class PushOutputRendererUseCase {
  execute(renderCommand: RenderCommand): PushRenderResult {
    const subject = (renderCommand.controlValues.subject as string) || 'Default Push Notification Subject';
    const body = (renderCommand.controlValues.body as string) || 'Default Push Notification Body';

    return { subject, body };
  }
}

// Concrete Renderer for In-App Message Preview
export class InAppOutputRendererUseCase {
  execute(renderCommand: RenderCommand): InAppRenderResult {
    const inApp = InAppPreviewResultSchema.parse(renderCommand.controlValues);

    return {
      subject: inApp.subject as string,
      body: inApp.body as string,
      avatar: inApp.avatar as string,
      primaryAction: {
        label: inApp.primaryAction.label as string,
        redirect: {
          url: inApp.primaryAction.redirect.url as string,
          target: inApp.primaryAction.redirect.target as RedirectTargetEnum,
        },
      },
      secondaryAction: (inApp.secondaryAction?.label as string)
        ? {
            label: inApp.secondaryAction?.label as string,
            redirect: {
              url: inApp.secondaryAction?.redirect.url as string,
              target: inApp.secondaryAction?.redirect.target as RedirectTargetEnum,
            },
          }
        : undefined,
      redirect: {
        url: inApp.redirect.url as string,
        target: inApp.redirect.target as RedirectTargetEnum,
      },
      data: inApp.data as Record<string, unknown>,
    };
  }
}
