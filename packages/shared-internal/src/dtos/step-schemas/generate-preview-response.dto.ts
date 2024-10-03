import { z } from 'zod';
import { ChannelTypeEnum } from '@novu/shared';
import { ControlPreviewIssueType } from './control-preview-issue.type';

export enum RedirectTargetEnum {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top',
  UNFENCED_TOP = '_unfencedTop',
}

// Define the Zod schemas for each preview result class
export const PreviewResultSchema = z.object({});

export const ChatPreviewResultSchema = PreviewResultSchema.extend({
  body: z.string(),
});

export const SmsPreviewResultSchema = PreviewResultSchema.extend({
  body: z.string(),
});

export const PushPreviewResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: z.string(),
});
export const TiptapNodeSchema = z.object({
  type: z.string(), // The type of the node must be a string
  content: z.array(z.lazy(() => TiptapNodeSchema)).optional(), // Optional array of nested TiptapNodes
  text: z.string().optional(), // Optional text property
  attr: z.record(z.any()).optional(), // Optional attributes as a record of key-value pairs
});

export const EmailRenderResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: TiptapNodeSchema,
});

export const InAppPreviewResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: z.string(),
  avatar: z.string().optional(),
  primaryAction: z.object({
    label: z.string(),
    redirect: z.object({
      url: z.string(),
      target: z.nativeEnum(RedirectTargetEnum).optional(),
    }),
  }),
  secondaryAction: z
    .object({
      label: z.string(),
      redirect: z.object({
        url: z.string(),
        target: z.nativeEnum(RedirectTargetEnum).optional(),
      }),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  redirect: z.object({
    url: z.string(),
    target: z.nativeEnum(RedirectTargetEnum).optional(),
  }),
});
export const ControlPreviewIssueSchema = z.object({
  issueType: z.nativeEnum(ControlPreviewIssueType), // Assuming ControlPreviewIssueType is an enum
  variableName: z.string().optional(), // Optional field
  message: z.string(), // Required field
});
// Export the inferred TypeScript type for ControlPreviewIssue
export type ControlPreviewIssue = z.infer<typeof ControlPreviewIssueSchema>;
// Define the GeneratePreviewResponseDto schema
export const GeneratePreviewResponseDtoSchema = z.object({
  issues: z.record(z.array(ControlPreviewIssueSchema)),
  result: z
    .union([
      z.object({
        type: z.literal(ChannelTypeEnum.EMAIL),
        preview: EmailRenderResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.IN_APP),
        preview: InAppPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.SMS),
        preview: SmsPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.PUSH),
        preview: PushPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.CHAT),
        preview: ChatPreviewResultSchema,
      }),
    ])
    .optional(),
});

// Export types for TypeScript inference without suffix
export type GeneratePreviewResponseDto = z.infer<typeof GeneratePreviewResponseDtoSchema>;
export type ChatRenderResult = z.infer<typeof ChatPreviewResultSchema>;
export type SmsRenderResult = z.infer<typeof SmsPreviewResultSchema>;
export type PushRenderResult = z.infer<typeof PushPreviewResultSchema>;
export type EmailRenderResult = z.infer<typeof EmailRenderResultSchema>;
export type InAppRenderResult = z.infer<typeof InAppPreviewResultSchema>;
export type BaseRenderResult = z.infer<typeof PreviewResultSchema>;
export type TiptapNodeDto = z.infer<typeof TiptapNodeSchema>;
