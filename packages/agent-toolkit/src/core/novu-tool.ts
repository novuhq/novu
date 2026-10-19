import type { ZodTypeAny } from 'zod';
import type { Novu } from '@novu/api';
import type { NovuToolkitConfig, NovuToolDefinition, NovuToolExecute } from './types.js';

type NovuToolArgs = {
  method: string;
  name: string;
  description: string;
  parameters: ZodTypeAny;
  execute: (client: Novu, config: NovuToolkitConfig) => NovuToolExecute<unknown>;
};

export function NovuTool(args: NovuToolArgs): NovuToolDefinition {
  const { method, name, description, parameters, execute } = args;

  return {
    method,
    name,
    description,
    parameters,
    bindExecute: (client: Novu, config: NovuToolkitConfig) => {
      const fn = execute(client, config);

      return async (params: unknown) => {
        try {
          return await fn(params);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          return { error: message };
        }
      };
    },
  };
}
