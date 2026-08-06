import type { AgentFileRef, AgentMessageContent, AgentToolResultContent, AgentToolSource } from './wire-content.types';

export const AGENT_EVENT_PROTOCOL_VERSION = 1 as const;

export interface AgentEventUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type AgentRunOutcome = 'completed' | 'paused' | 'aborted';
export type AgentFinishReason = 'stop' | 'length' | 'refused' | 'other';

export interface AgentApprovalRequest {
  approvalId: string;
  toolUseId: string;
  toolName: string;
  input?: Record<string, unknown>;
  source?: AgentToolSource;
}

export type AgentSignal =
  | { type: 'metadata'; action: 'set'; key: string; value: unknown }
  | { type: 'metadata'; action: 'delete'; key: string }
  | { type: 'metadata'; action: 'clear' }
  | { type: 'trigger'; workflowId: string; to?: unknown; payload?: Record<string, unknown> };

export type AgentEvent =
  // Lifecycle
  | { type: 'run-start' }
  | {
      type: 'run-finish';
      outcome: AgentRunOutcome;
      finishReason?: AgentFinishReason;
      usage?: AgentEventUsage;
      approvals?: AgentApprovalRequest[];
    }
  | { type: 'run-error'; message: string; code?: string }
  | { type: 'step-start'; name?: string; index?: number }
  | { type: 'step-end'; name?: string; index?: number; usage?: AgentEventUsage }
  // Content
  | { type: 'message'; messageId: string; content: AgentMessageContent; files?: AgentFileRef[] }
  | { type: 'message-start'; messageId: string }
  | { type: 'message-delta'; messageId: string; delta: string }
  | { type: 'message-end'; messageId: string; content?: AgentMessageContent; files?: AgentFileRef[] }
  | { type: 'thinking-start'; thinkingId: string }
  | { type: 'thinking-delta'; thinkingId: string; delta: string }
  | { type: 'thinking-end'; thinkingId: string }
  | {
      type: 'source';
      messageId: string;
      sourceType: 'url' | 'document';
      url?: string;
      title?: string;
      filename?: string;
    }
  // Tools & HITL
  | { type: 'tool-use-start'; toolUseId: string; toolName: string; source?: AgentToolSource }
  | { type: 'tool-use-delta'; toolUseId: string; delta: string }
  | {
      type: 'tool-use-done';
      toolUseId: string;
      toolName: string;
      input?: Record<string, unknown>;
      source?: AgentToolSource;
    }
  | { type: 'tool-use-result'; toolUseId: string; content: AgentToolResultContent[]; isError?: boolean }
  | ({
      type: 'tool-approval-request';
      /** When true, no companion message carries the approval UI — the consumer should render its default approval card. */
      deliverCard?: boolean;
    } & AgentApprovalRequest)
  | {
      type: 'tool-approval-response';
      approvalId: string;
      decision: 'approved' | 'denied';
      reason?: string;
      automatic?: boolean;
    }
  // Conversation ops
  | { type: 'resolve'; summary?: string }
  | { type: 'signal'; signal: AgentSignal }
  // Channel ops (imperative — emitted only by the framework SDK)
  | { type: 'channel.typing'; state: 'on' | 'off'; status?: string }
  | { type: 'channel.edit'; messageId: string; content: AgentMessageContent; files?: AgentFileRef[] }
  | { type: 'channel.delete'; messageId: string }
  | { type: 'channel.reaction'; messageId: string; emoji: string; op: 'add' | 'remove' }
  // Runtime / connection ops
  | {
      type: 'connection.error';
      source: 'mcp';
      serverName: string;
      reason: 'authentication' | 'connection';
      message: string;
    }
  // Escape hatch
  | { type: 'custom'; name: string; data: unknown };

export interface AgentEventEnvelope {
  version: typeof AGENT_EVENT_PROTOCOL_VERSION;
  conversationId: string;
  /** Public `conv_*` identifier. Clients receive only this id, never `conversationId`. */
  conversationIdentifier?: string;
  agentId: string;
  runId: string;
  turnId: string;
  sequence: number;
  timestamp: string;
  event: AgentEvent;
}

const DELTA_EVENT_TYPES = new Set(['message-delta', 'thinking-delta', 'tool-use-delta']);

export function isDeltaEvent(event: { type: string }): boolean {
  return DELTA_EVENT_TYPES.has(event.type);
}

export function isAgentEventEnvelope(value: unknown): value is AgentEventEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const event = candidate.event as Record<string, unknown> | undefined;

  return (
    candidate.version === AGENT_EVENT_PROTOCOL_VERSION &&
    typeof candidate.conversationId === 'string' &&
    typeof candidate.agentId === 'string' &&
    typeof candidate.runId === 'string' &&
    typeof candidate.turnId === 'string' &&
    typeof candidate.sequence === 'number' &&
    typeof candidate.timestamp === 'string' &&
    typeof event === 'object' &&
    event !== null &&
    typeof event.type === 'string'
  );
}
