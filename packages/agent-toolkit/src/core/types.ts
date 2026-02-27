import type { ZodTypeAny } from 'zod';
import type { Novu } from '@novu/api';

export type NovuToolkitConfig = {
  secretKey: string;
  subscriberId: string;
  backendUrl?: string;
  context?: Record<string, unknown>;
  workflows?: {
    tags?: string[];
    workflowIds?: string[];
  };
};

export type NovuToolExecute<TParams> = (params: TParams) => Promise<unknown>;

export type NovuToolDefinition = {
  method: string;
  name: string;
  description: string;
  parameters: ZodTypeAny;
  bindExecute: (client: Novu, config: NovuToolkitConfig) => NovuToolExecute<unknown>;
};
