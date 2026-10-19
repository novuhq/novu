import type { Novu } from '@novu/api';
import type {
  DeferredToolCall,
  DeferredToolCallInteractionResult,
  DeferredToolCallWorkflowPayload,
  HumanDecision,
  HumanInputConfig,
  WebhookEvent,
} from './types.js';

export type { DeferredToolCall, DeferredToolCallInteractionResult, HumanDecision, HumanInputConfig, WebhookEvent };

const DEFAULT_ALLOWED_DECISIONS: Array<'approve' | 'edit' | 'reject'> = ['approve', 'reject'];

export function wrapToolDescription(description: string): string {
  return `${description}\n\nThis tool call is deferred and requires human input before execution. You will NOT receive a result immediately — this is NOT an error. Do NOT retry the tool call. The result will be provided once a human has reviewed and approved the action.`;
}

export async function triggerHumanInputWorkflow({
  client,
  toolCall,
  inputConfig,
}: {
  client: Novu;
  toolCall: DeferredToolCall;
  inputConfig: HumanInputConfig;
}): Promise<unknown> {
  if (inputConfig.onBeforeTrigger) {
    await inputConfig.onBeforeTrigger(toolCall);
  }

  const payload: DeferredToolCallWorkflowPayload = {
    type: 'deferred_tool_call',
    toolCall,
    allowedDecisions: inputConfig.allowedDecisions ?? DEFAULT_ALLOWED_DECISIONS,
    metadata: inputConfig.metadata,
  };

  const response = await client.trigger({
    workflowId: inputConfig.workflowId,
    to: inputConfig.subscribers.length === 1 ? inputConfig.subscribers[0] : inputConfig.subscribers,
    payload: payload as unknown as Record<string, unknown>,
  });

  if (inputConfig.onAfterTrigger) {
    await inputConfig.onAfterTrigger(toolCall, response.result);
  }

  return response.result;
}

export function handleWebhookEvent(event: WebhookEvent): DeferredToolCallInteractionResult | null {
  if (event.type !== 'message.interacted') {
    return null;
  }

  const message = event.data;

  if (!message?.data || message.data.type !== 'deferred_tool_call' || !message.data.toolCall) {
    return null;
  }

  const { toolCall, metadata, decision } = message.data;

  const resolvedDecision: HumanDecision = decision ?? { type: 'approve' };

  return {
    workflowId: message.source?.key ?? '',
    decision: resolvedDecision,
    toolCall: {
      id: toolCall.id,
      method: toolCall.method,
      args: toolCall.args,
      extra: toolCall.extra,
    },
    metadata,
    context: {
      messageId: message.id ?? '',
      channelId: message.channel_id ?? '',
      timestamp: event.created_at,
    },
  };
}

export async function executeWithDecision(
  executeFn: (args: unknown) => Promise<unknown>,
  toolCall: DeferredToolCall,
  decision: HumanDecision,
): Promise<unknown> {
  if (decision.type === 'reject') {
    return { type: 'tool-status', status: 'rejected', message: decision.message };
  }

  const args = decision.type === 'edit' ? decision.args : toolCall.args;

  return executeFn(args);
}
