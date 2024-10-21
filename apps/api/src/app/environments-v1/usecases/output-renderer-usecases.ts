// Base interface for all renderers
import { render } from '@maily-to/render';
import {
  ChatRenderOutput,
  EmailRenderOutput,
  InAppRenderOutput,
  PushRenderOutput,
  RedirectTargetEnum,
  SmsRenderOutput,
  TipTapNode,
} from '@novu/shared';
import { z } from 'zod';
import { ExpendEmailEditorSchemaUseCase } from '../../environments/render/email-schema-extender';

class RenderCommand {
  controlValues: Record<string, unknown>;
}

export class EmailOutputRendererUseCase {
  async execute(renderCommand: RenderCommand): Promise<EmailRenderOutput> {
    const parse = EmailStepControlSchema.parse(renderCommand.controlValues);
    const schema = parse.emailEditor as TipTapNode;
    const expandedSchema = new ExpendEmailEditorSchemaUseCase().execute({ schema });
    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}

// Concrete Renderer for Chat Preview
export class ChatOutputRendererUseCase {
  execute(renderCommand: RenderCommand): ChatRenderOutput {
    const body = renderCommand.controlValues.body as string;

    return { body };
  }
}

// Concrete Renderer for SMS Preview
export class SmsOutputRendererUseCase {
  execute(renderCommand: RenderCommand): SmsRenderOutput {
    const body = renderCommand.controlValues.body as string;

    return { body };
  }
}

// Concrete Renderer for Push Notification Preview
export class PushOutputRendererUseCase {
  execute(renderCommand: RenderCommand): PushRenderOutput {
    const subject = renderCommand.controlValues.subject as string;
    const body = renderCommand.controlValues.body as string;

    return { subject, body };
  }
}

// Concrete Renderer for In-App Message Preview
export class InAppOutputRendererUseCase {
  execute(renderCommand: RenderCommand): InAppRenderOutput {
    const inApp = InAppRenderOutputSchema.parse(renderCommand.controlValues);

    return {
      subject: inApp.subject,
      body: inApp.body,
      avatar: inApp.avatar,
      primaryAction: {
        label: inApp.primaryAction.label,
        redirect: {
          url: inApp.primaryAction.redirect.url,
          target: inApp.primaryAction.redirect.target as RedirectTargetEnum,
        },
      },
      secondaryAction: inApp.secondaryAction?.label
        ? {
            label: inApp.secondaryAction?.label,
            redirect: {
              url: inApp.secondaryAction?.redirect.url,
              target: inApp.secondaryAction?.redirect.target as RedirectTargetEnum,
            },
          }
        : undefined,
      redirect: {
        url: inApp.redirect.url,
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
