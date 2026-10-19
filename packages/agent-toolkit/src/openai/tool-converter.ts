import { z } from 'zod';
import type { NovuToolDefinition } from '../core/types.js';

export type OpenAIFunctionTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function novuToolToOpenAITool(tool: NovuToolDefinition): OpenAIFunctionTool {
  return {
    type: 'function',
    function: {
      name: tool.method,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters) as Record<string, unknown>,
    },
  };
}
