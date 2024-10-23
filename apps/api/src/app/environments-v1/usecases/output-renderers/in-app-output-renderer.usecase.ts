// Concrete Renderer for In-App Message Preview
import { InAppRenderOutput, RedirectTargetEnum } from '@novu/shared';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';

@Injectable()
export class InAppOutputRendererUsecase {
  execute(renderCommand: RenderCommand): InAppRenderOutput {
    const inApp = InAppRenderOutputSchema.parse(renderCommand.controlValues);

    return {
      subject: inApp.subject,
      body: inApp.body,
      avatar: inApp.avatar,
      primaryAction: inApp.primaryAction
        ? {
            label: inApp.primaryAction.label,
            redirect: {
              url: inApp.primaryAction.redirect.url,
              target: inApp.primaryAction.redirect.target as RedirectTargetEnum,
            },
          }
        : undefined,
      secondaryAction: inApp.secondaryAction
        ? {
            label: inApp.secondaryAction?.label,
            redirect: {
              url: inApp.secondaryAction?.redirect.url,
              target: inApp.secondaryAction?.redirect.target as RedirectTargetEnum,
            },
          }
        : undefined,
      redirect: inApp.redirect
        ? {
            url: inApp.redirect.url,
            target: inApp.redirect.target as RedirectTargetEnum,
          }
        : undefined,
      data: inApp.data as Record<string, unknown>,
    };
  }
}
const RedirectTargetEnumSchema = z.enum(['_self', '_blank', '_parent', '_top', '_unfencedTop']);

const InAppRenderOutputSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
  avatar: z.string().optional(),
  primaryAction: z
    .object({
      label: z.string(),
      redirect: z.object({
        url: z.string(),
        target: RedirectTargetEnumSchema.optional(), // Optional target
      }),
    })
    .optional(),
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
  redirect: z
    .object({
      url: z.string(),
      target: RedirectTargetEnumSchema.optional(), // Optional target
    })
    .optional(),
});
