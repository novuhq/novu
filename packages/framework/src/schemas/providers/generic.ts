import { z } from 'zod';
import { Schema } from '../../types';

export const genericProviderSchemas = {
  output: z.record(z.string(), z.any()),
} satisfies { output: Schema };
