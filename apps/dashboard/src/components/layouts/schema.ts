import * as z from 'zod';

export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 256;

export const layoutSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  layoutId: z.string().min(1),
  isTranslationEnabled: z.boolean().default(false),
});
