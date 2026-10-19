import { tool, type Tool, type ToolExecutionOptions, type ToolSet } from 'ai';
import type { ZodTypeAny } from 'zod';
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
import { novuToolToAiSdkTool } from './tool-converter.js';

export type { ToolSet as AiSdkToolSet };
export type { DeferredToolCall, DeferredToolCallInteractionResult, HumanDecision, HumanInputConfig, WebhookEvent };

type NovuAiSdkToolkit = {
  tools: ToolSet;
  requireHumanInput: (toolsToWrap: ToolSet, inputConfig: HumanInputConfig) => ToolSet;
  resumeToolExecution: (toolCall: DeferredToolCall, decision: HumanDecision) => Promise<unknown>;
  handleWebhookEvent: (event: WebhookEvent) => DeferredToolCallInteractionResult | null;
};

export async function createNovuAgentToolkit(config: NovuToolkitConfig): Promise<NovuAiSdkToolkit> {
  const toolkit = new NovuToolkit(config);
  await toolkit.initialize();

  const novuTools = toolkit.getTools();
  const client = toolkit.getClient();
  const toolkitConfig = toolkit.getConfig();

  const tools: ToolSet = Object.fromEntries(
    novuTools.map((t) => [t.method, novuToolToAiSdkTool(t, client, toolkitConfig)]),
  );

  const pendingTools = new Map<string, Tool>();

  const requireHumanInput = (toolsToWrap: ToolSet, inputConfig: HumanInputConfig): ToolSet => {
    const wrappedTools: ToolSet = {};

    for (const [method, originalTool] of Object.entries(toolsToWrap)) {
      pendingTools.set(method, originalTool);

      wrappedTools[method] = tool({
        description: wrapToolDescription(originalTool.description ?? ''),
        inputSchema: originalTool.inputSchema as ZodTypeAny,
        execute: async (args: unknown, options: ToolExecutionOptions) => {
          const toolCall: DeferredToolCall = {
            id: options.toolCallId ?? crypto.randomUUID(),
            method,
            args,
            extra: { toolCallId: options.toolCallId },
          };

          await triggerHumanInputWorkflow({
            client,
            toolCall,
            inputConfig,
          });

          return {
            type: 'tool-status',
            status: 'pending-input',
            toolCallId: toolCall.id,
          };
        },
      }) as Tool;
    }

    return wrappedTools;
  };

  const resumeToolExecution = async (toolCall: DeferredToolCall, decision: HumanDecision): Promise<unknown> => {
    const originalTool = pendingTools.get(toolCall.method);

    if (!originalTool) {
      throw new Error(
        `Tool "${toolCall.method}" not found. Make sure requireHumanInput was called with this tool before attempting to resume.`,
      );
    }

    const executeFn = originalTool.execute as
      | ((args: unknown, options: ToolExecutionOptions) => PromiseLike<unknown>)
      | undefined;

    if (!executeFn) {
      throw new Error(`Tool "${toolCall.method}" does not have an execute function.`);
    }

    const options: ToolExecutionOptions = {
      toolCallId: (toolCall.extra?.toolCallId as string) ?? toolCall.id,
      messages: [],
    };

    const result = await executeWithDecision(
      (args) => executeFn(args, options) as Promise<unknown>,
      toolCall,
      decision,
    );

    if (decision.type === 'reject') {
      return result;
    }

    return {
      type: 'tool-status',
      status: 'completed',
      toolCallId: toolCall.id,
      result,
    };
  };

  return {
    tools,
    requireHumanInput,
    resumeToolExecution,
    handleWebhookEvent,
  };
}
