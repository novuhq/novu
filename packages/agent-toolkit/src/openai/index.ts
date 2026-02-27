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
import { novuToolToOpenAITool, type OpenAIFunctionTool } from './tool-converter.js';

export type { OpenAIFunctionTool };
export type { DeferredToolCall, DeferredToolCallInteractionResult, HumanDecision, HumanInputConfig, WebhookEvent };

type ToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

type ToolCallResult = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

type NovuOpenAIToolkit = {
  tools: OpenAIFunctionTool[];
  handleToolCall: (toolCall: ToolCall) => Promise<ToolCallResult>;
  requireHumanInput: (toolsToWrap: OpenAIFunctionTool[], inputConfig: HumanInputConfig) => OpenAIFunctionTool[];
  resumeToolExecution: (toolCall: DeferredToolCall, decision: HumanDecision) => Promise<ToolCallResult>;
  handleWebhookEvent: (event: WebhookEvent) => DeferredToolCallInteractionResult | null;
};

export async function createNovuAgentToolkit(config: NovuToolkitConfig): Promise<NovuOpenAIToolkit> {
  const toolkit = new NovuToolkit(config);
  await toolkit.initialize();

  const novuTools = toolkit.getTools();
  const client = toolkit.getClient();
  const toolkitConfig = toolkit.getConfig();

  const tools = novuTools.map(novuToolToOpenAITool);

  const toolMap = new Map(novuTools.map((t) => [t.method, t]));
  const guardedToolConfigs = new Map<string, HumanInputConfig>();

  const requireHumanInput = (
    toolsToWrap: OpenAIFunctionTool[],
    inputConfig: HumanInputConfig,
  ): OpenAIFunctionTool[] => {
    return toolsToWrap.map((t) => {
      guardedToolConfigs.set(t.function.name, inputConfig);

      return {
        ...t,
        function: {
          ...t.function,
          description: wrapToolDescription(t.function.description ?? ''),
        },
      };
    });
  };

  const handleToolCall = async (toolCall: ToolCall): Promise<ToolCallResult> => {
    const toolName = toolCall.function.name;
    const guardedConfig = guardedToolConfigs.get(toolName);

    let args: unknown;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: 'Invalid tool arguments: failed to parse JSON.' }),
      };
    }

    if (guardedConfig) {
      const deferredCall: DeferredToolCall = {
        id: toolCall.id,
        method: toolName,
        args,
      };

      await triggerHumanInputWorkflow({
        client,
        toolCall: deferredCall,
        inputConfig: guardedConfig,
      });

      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ type: 'tool-status', status: 'pending-input', toolCallId: toolCall.id }),
      };
    }

    const tool = toolMap.get(toolName);

    if (!tool) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
      };
    }

    const result = await tool.bindExecute(client, toolkitConfig)(args);

    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    };
  };

  const resumeToolExecution = async (
    toolCall: DeferredToolCall,
    decision: HumanDecision,
  ): Promise<ToolCallResult> => {
    const tool = toolMap.get(toolCall.method);

    if (!tool) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: `Unknown tool: ${toolCall.method}` }),
      };
    }

    const result = await executeWithDecision(
      (args) => tool.bindExecute(client, toolkitConfig)(args),
      toolCall,
      decision,
    );

    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    };
  };

  return { tools, handleToolCall, requireHumanInput, resumeToolExecution, handleWebhookEvent };
}
