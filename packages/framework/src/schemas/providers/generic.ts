import { z } from 'zod';

export const genericProviderSchemas = {
  output: z.record(z.string(), z.any()),
};
