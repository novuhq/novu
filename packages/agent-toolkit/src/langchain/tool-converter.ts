import { DynamicStructuredTool } from '@langchain/core/tools';
import type { Novu } from '@novu/api';
import type { NovuToolDefinition, NovuToolkitConfig } from '../core/types.js';

export function novuToolToLangchainTool(
  tool: NovuToolDefinition,
  client: Novu,
  config: NovuToolkitConfig,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: tool.method,
    description: tool.description,
    schema: tool.parameters as never,
    func: async (input) => {
      const result = await tool.bindExecute(client, config)(input);

      return typeof result === 'string' ? result : JSON.stringify(result);
    },
  });
}
