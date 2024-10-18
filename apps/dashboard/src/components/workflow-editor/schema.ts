import * as z from 'zod';
import { StepTypeEnum } from '@/utils/enums';

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
});
