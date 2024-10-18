// Base interface for all renderers
import { render } from '@maily-to/render';
import {
  ChatRenderOutput,
  EmailRenderOutput,
  InAppRenderOutput,
  PushRenderOutput,
  RedirectTargetEnum,
  SmsRenderOutput,
} from '@novu/shared';
import { z } from 'zod';
import { ExpendEmailEditorSchemaUseCase } from '../../environments/render/email-schema-extender';

class RenderCommand {
  controlValues: Record<string, unknown>;
}

export class EmailOutputRendererUseCase {
  async execute(renderCommand: RenderCommand): Promise<EmailRenderOutput> {
    const parse = EmailStepControlSchema.parse(renderCommand.controlValues);
    const expandedSchema = new ExpendEmailEditorSchemaUseCase().execute({ schema: parse.emailEditor });
    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}

// Concrete Renderer for Chat Preview
export class ChatOutputRendererUseCase {
  execute(renderCommand: RenderCommand): ChatRenderOutput {
    const body = (renderCommand.controlValues.body as string) || 'Default chat message';

    return { body };
  }
}

// Concrete Renderer for SMS Preview
export class SmsOutputRendererUseCase {
  execute(renderCommand: RenderCommand): SmsRenderOutput {
    const body = (renderCommand.controlValues.body as string) || 'Default SMS message';

    return { body };
  }
}

// Concrete Renderer for Push Notification Preview
export class PushOutputRendererUseCase {
  execute(renderCommand: RenderCommand): PushRenderOutput {
    const subject = (renderCommand.controlValues.subject as string) || 'Default Push Notification Subject';
    const body = (renderCommand.controlValues.body as string) || 'Default Push Notification Body';

    return { subject, body };
  }
}

// Concrete Renderer for In-App Message Preview
export class InAppOutputRendererUseCase {
  execute(renderCommand: RenderCommand): InAppRenderOutput {
    const inApp = InAppRenderOutputSchema.parse(renderCommand.controlValues);

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
const emailContentSchema = z
  .object({
    type: z.string(),
    content: z.array(z.lazy(() => emailContentSchema)).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();

const emailEditorSchema = z
  .object({
    type: z.string(),
    content: z.array(emailContentSchema).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();

export const EmailStepControlSchema = z
  .object({
    emailEditor: emailEditorSchema,
    subject: z.string(),
  })
  .strict();
const RedirectTargetEnumSchema = z.enum(['_self', '_blank', '_parent', '_top', '_unfencedTop']);

// Define the InAppRenderOutput schema using Zod
const InAppRenderOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  avatar: z.string().optional(),
  primaryAction: z.object({
    label: z.string(),
    redirect: z.object({
      url: z.string(),
      target: RedirectTargetEnumSchema.optional(), // Optional target
    }),
  }),
  secondaryAction: z
    .object({
      label: z.string(),
      redirect: z.object({
        url: z.string(),
        target: RedirectTargetEnumSchema.optional(), // Optional target
      }),
    })
    .optional(), // Optional secondary action
  data: z.record(z.unknown()).optional(), // Optional data
  redirect: z.object({
    url: z.string(),
    target: RedirectTargetEnumSchema.optional(), // Optional target
  }),
});
