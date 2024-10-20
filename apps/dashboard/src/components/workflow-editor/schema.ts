import * as z from 'zod';
import { StepTypeEnum } from '@/utils/enums';

export const formSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  critical: z.boolean().optional(),
  steps: z.array(
    z.object({
      name: z.string(),
      type: z.nativeEnum(StepTypeEnum),
      controls: z.object({ schema: z.object({}) }),
      controlValues: z.object({}),
    })
  ),
});
