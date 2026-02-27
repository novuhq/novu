export type HumanDecision =
  | { type: 'approve' }
  | { type: 'edit'; args: Record<string, unknown> }
  | { type: 'reject'; message: string };

export type DeferredToolCall = {
  id: string;
  method: string;
  args: unknown;
  extra?: Record<string, unknown>;
};

export type HumanInputConfig = {
  workflowId: string;
  subscribers: string[];
  allowedDecisions?: Array<'approve' | 'edit' | 'reject'>;
  metadata?: Record<string, unknown>;
  onBeforeTrigger?: (toolCall: DeferredToolCall) => Promise<void>;
  onAfterTrigger?: (toolCall: DeferredToolCall, result: unknown) => Promise<void>;
};

export type DeferredToolCallWorkflowPayload = {
  type: 'deferred_tool_call';
  toolCall: DeferredToolCall;
  allowedDecisions: Array<'approve' | 'edit' | 'reject'>;
  metadata?: Record<string, unknown>;
};

export type WebhookEvent = {
  type: string;
  created_at: string;
  event_data?: unknown;
  data?: {
    id?: string;
    channel_id?: string;
    source?: { key?: string };
    data?: {
      type?: string;
      toolCall?: DeferredToolCall;
      metadata?: Record<string, unknown>;
      decision?: HumanDecision;
    };
  };
};

export type DeferredToolCallInteractionResult = {
  workflowId: string;
  decision: HumanDecision;
  toolCall: DeferredToolCall;
  metadata?: Record<string, unknown>;
  context: {
    messageId: string;
    channelId: string;
    timestamp: string;
  };
};
