import { DynamicStructuredTool } from '@langchain/core/tools';
import { NovuToolkit } from '../core/novu-toolkit.js';
import type { NovuToolkitConfig } from '../core/types.js';
import {
  executeWithDecision,
  handleWebhookEvent,
  triggerHumanInputWorkflow,
  wrapToolDescription,
} from '../human-in-the-loop/index.js';
import type {
  DeferredToolCall,
  DeferredToolCallInteractionResult,
  HumanDecision,
  HumanInputConfig,
  WebhookEvent,
} from '../human-in-the-loop/types.js';
import { novuToolToLangchainTool } from './tool-converter.js';

export type { DeferredToolCall, DeferredToolCallInteractionResult, HumanDecision, HumanInputConfig, WebhookEvent };

type NovuLangchainToolkit = {
  tools: DynamicStructuredTool[];
  requireHumanInput: (toolsToWrap: DynamicStructuredTool[], inputConfig: HumanInputConfig) => DynamicStructuredTool[];
  resumeToolExecution: (toolCall: DeferredToolCall, decision: HumanDecision) => Promise<string>;
  handleWebhookEvent: (event: WebhookEvent) => DeferredToolCallInteractionResult | null;
};

export async function createNovuAgentToolkit(config: NovuToolkitConfig): Promise<NovuLangchainToolkit> {
  const toolkit = new NovuToolkit(config);
  await toolkit.initialize();

  const novuTools = toolkit.getTools();
  const client = toolkit.getClient();
  const toolkitConfig = toolkit.getConfig();

  const tools = novuTools.map((tool) => novuToolToLangchainTool(tool, client, toolkitConfig));

  const pendingTools = new Map<string, DynamicStructuredTool>();

  const requireHumanInput = (
    toolsToWrap: DynamicStructuredTool[],
    inputConfig: HumanInputConfig,
  ): DynamicStructuredTool[] => {
    return toolsToWrap.map((originalTool) => {
      pendingTools.set(originalTool.name, originalTool);

      return new DynamicStructuredTool({
        name: originalTool.name,
        description: wrapToolDescription(originalTool.description),
        schema: originalTool.schema as never,
        func: async (args: unknown) => {
          const toolCall: DeferredToolCall = {
            id: crypto.randomUUID(),
            method: originalTool.name,
            args,
          };

          await triggerHumanInputWorkflow({
            client,
            toolCall,
            inputConfig,
          });

          return JSON.stringify({ type: 'tool-status', status: 'pending-input', toolCallId: toolCall.id });
        },
      });
    });
  };

  const resumeToolExecution = async (toolCall: DeferredToolCall, decision: HumanDecision): Promise<string> => {
    const originalTool = pendingTools.get(toolCall.method);

    if (!originalTool) {
      throw new Error(
        `Tool "${toolCall.method}" not found. Make sure requireHumanInput was called with this tool before attempting to resume.`,
      );
    }

    const result = await executeWithDecision(
      async (args) => originalTool.func(args as Record<string, unknown>),
      toolCall,
      decision,
    );

    return typeof result === 'string' ? result : JSON.stringify(result);
  };

  return { tools, requireHumanInput, resumeToolExecution, handleWebhookEvent };
}
