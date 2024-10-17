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
import { expendSchema } from './email-schema-extender';

export class EmailOutputRenderer {
  async render(controlValues: Record<string, unknown>): Promise<EmailRenderResult> {
    const parse = EmailStepControlSchema.parse(controlValues);
    const expandedSchema = expendSchema(parse.emailEditor);
    console.log('expandedSchema', JSON.stringify(expandedSchema, null, 2));
    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}

// Concrete Renderer for Chat Preview
export class ChatOutputRenderer {
  render(controlValues: Record<string, unknown>): ChatRenderResult {
    const body = (controlValues.body as string) || 'Default chat message';

    return { body };
  }
}

// Concrete Renderer for SMS Preview
export class SmsOutputRenderer {
  render(controlValues: Record<string, unknown>): SmsRenderResult {
    const body = (controlValues.body as string) || 'Default SMS message';

    return { body };
  }
}

// Concrete Renderer for Push Notification Preview
export class PushOutputRenderer {
  render(controlValues: Record<string, unknown>): PushRenderResult {
    const subject = (controlValues.subject as string) || 'Default Push Notification Subject';
    const body = (controlValues.body as string) || 'Default Push Notification Body';

    return { subject, body };
  }
}

// Concrete Renderer for In-App Message Preview
export class InAppOutputRenderer {
  render(controlValues: Record<string, unknown>): InAppRenderResult {
    const inApp = InAppPreviewResultSchema.parse(controlValues);

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
