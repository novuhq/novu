import { tool, type Tool } from 'ai';
import type { ZodTypeAny } from 'zod';
import type { Novu } from '@novu/api';
import type { NovuToolDefinition, NovuToolkitConfig } from '../core/types.js';

export function novuToolToAiSdkTool(
  novuTool: NovuToolDefinition,
  client: Novu,
  config: NovuToolkitConfig,
): Tool {
  return tool({
    description: novuTool.description,
    inputSchema: novuTool.parameters as ZodTypeAny,
    execute: async (input: unknown) => novuTool.bindExecute(client, config)(input),
  }) as Tool;
}
