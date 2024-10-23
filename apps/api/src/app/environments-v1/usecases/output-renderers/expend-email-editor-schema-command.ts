// Define the command interface

import { BaseCommand } from '@novu/application-generic';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ExpendEmailEditorSchemaCommand extends BaseCommand {
  schema: string;
}
export const TipTapSchema = z
  .object({
    type: z.string(),
    content: z.array(z.lazy(() => TipTapSchema)).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();
