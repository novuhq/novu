// Base interface for all renderers
import {
  BaseRenderResult,
  ChatRenderResult,
  EmailRenderResult,
  EmailRenderResultSchema,
  InAppPreviewResultSchema,
  InAppRenderResult,
  PushRenderResult,
  RedirectTargetEnum,
  SmsRenderResult,
} from '@novu/shared-internal';
import { expendSchema, TiptapNode } from './email-schema-extender';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Renderer<T extends BaseRenderResult> {
  render(controlValues: Record<string, unknown>): T;
}
export class EmailOutputRenderer implements Renderer<EmailRenderResult> {
  render(controlValues: Record<string, unknown>): EmailRenderResult {
    const parse = EmailRenderResultSchema.parse(controlValues);
    const body = expendSchema(parse.body as TiptapNode);

    return { subject: parse.subject, body: JSON.stringify(body) };
  }
}

// Concrete Renderer for Chat Preview
export class ChatOutputRenderer implements Renderer<ChatRenderResult> {
  render(controlValues: Record<string, unknown>): ChatRenderResult {
    const body = (controlValues.body as string) || 'Default chat message';

    return { body };
  }
}

// Concrete Renderer for SMS Preview
export class SmsOutputRenderer implements Renderer<SmsRenderResult> {
  render(controlValues: Record<string, unknown>): SmsRenderResult {
    const body = (controlValues.body as string) || 'Default SMS message';

    return { body };
  }
}

// Concrete Renderer for Push Notification Preview
export class PushOutputRenderer implements Renderer<PushRenderResult> {
  render(controlValues: Record<string, unknown>): PushRenderResult {
    const subject = (controlValues.subject as string) || 'Default Push Notification Subject';
    const body = (controlValues.body as string) || 'Default Push Notification Body';

    return { subject, body };
  }
}

// Concrete Renderer for In-App Message Preview
export class InAppOutputRenderer implements Renderer<InAppRenderResult> {
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
