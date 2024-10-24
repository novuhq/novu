import * as z from 'zod';
import { StepTypeEnum } from '@/utils/enums';

const enabledSchema = z.object({
  enabled: z.boolean(),
});

// Reusable schema for channels
const channelsSchema = z.object({
  in_app: enabledSchema,
  sms: enabledSchema,
  email: enabledSchema,
  push: enabledSchema,
  chat: enabledSchema,
});

export const formSchema = z.object({
  name: z.string(),
  workflowId: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  critical: z.boolean().optional(),
  steps: z.array(
    z
      .object({
        name: z.string(),
        type: z.nativeEnum(StepTypeEnum),
      })
      .passthrough()
  ),
  preferences: z.object({
    /**
     * TODO: Add user schema
     */
    user: z.any().nullable(),
    default: z.object({
      all: z.object({
        enabled: z.boolean(),
        readOnly: z.boolean(),
      }),
      channels: channelsSchema,
    }),
  }),
});
