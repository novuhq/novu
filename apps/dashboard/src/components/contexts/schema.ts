import { z } from 'zod';

const CONTEXT_IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

export const CreateContextFormSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .max(100, 'ID must be 100 characters or less')
    .regex(CONTEXT_IDENTIFIER_REGEX, 'ID must match: /^[a-zA-Z0-9_-]+$/'),
  type: z
    .string()
    .min(1, 'Type is required')
    .max(100, 'Type must be 100 characters or less')
    .regex(CONTEXT_IDENTIFIER_REGEX, 'Type must match: /^[a-zA-Z0-9_-]+$/'),
  data: z
    .string()
    .transform((str, ctx) => {
      try {
        if (!str) return {};
        return JSON.parse(str);
      } catch (_e) {
        ctx.addIssue({ code: 'custom', message: 'Custom data must be a valid JSON' });
        return z.NEVER;
      }
    })
    .optional(),
});

export const EditContextFormSchema = z.object({
  data: z
    .string()
    .transform((str, ctx) => {
      try {
        if (!str) return {};
        return JSON.parse(str);
      } catch (_e) {
        ctx.addIssue({ code: 'custom', message: 'Custom data must be a valid JSON' });
        return z.NEVER;
      }
    })
    .optional(),
});
