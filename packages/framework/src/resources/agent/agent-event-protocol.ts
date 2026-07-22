/**
 * Agent event protocol types — synced from @novu/shared/types/agent-events.
 * Duplicated here because @novu/framework cannot depend on @novu/shared yet.
 */

export const AGENT_EVENT_PROTOCOL_VERSION = 1 as const;

export type AgentMessageContent = { markdown: string } | { card: Record<string, unknown> };

export interface AgentFileRef {
  fileId: string;
  name?: string;
  mediaType?: string;
  data?: string;
}

export type AgentRunOutcome = 'completed' | 'paused' | 'aborted';
export type AgentFinishReason = 'stop' | 'length' | 'refused' | 'other';

export interface AgentEventUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type AgentToolSource = { type: 'builtin' } | { type: 'custom' } | { type: 'mcp'; serverName: string };

export type AgentToolResultContent =
  | { type: 'text'; text: string }
  | { type: 'citation'; url: string; title?: string; excerpts?: string[] }
  | { type: 'json'; value: unknown }
  | { type: 'media'; mediaType: string; data: string; name?: string }
  | { type: 'unknown'; providerType: string; data: Record<string, unknown> };

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
  | { type: 'run-start' }
  | {
      type: 'run-finish';
      outcome: AgentRunOutcome;
      finishReason?: AgentFinishReason;
      usage?: AgentEventUsage;
    }
  | { type: 'run-error'; message: string; code?: string }
  | { type: 'step-start'; name?: string; index?: number }
  | { type: 'step-end'; name?: string; index?: number; usage?: AgentEventUsage }
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
  | ({ type: 'tool-approval-request' } & AgentApprovalRequest)
  | {
      type: 'tool-approval-response';
      approvalId: string;
      decision: 'approved' | 'denied';
      reason?: string;
      automatic?: boolean;
    }
  | { type: 'resolve'; summary?: string }
  | { type: 'signal'; signal: AgentSignal }
  | { type: 'channel.typing'; state: 'on' | 'off'; status?: string }
  | { type: 'channel.edit'; messageId: string; content: AgentMessageContent; files?: AgentFileRef[] }
  | { type: 'channel.delete'; messageId: string }
  | { type: 'channel.reaction'; messageId: string; emoji: string; op: 'add' | 'remove' }
  | {
      type: 'connection.error';
      source: 'mcp';
      serverName: string;
      reason: 'authentication' | 'connection';
      message: string;
    }
  | { type: 'custom'; name: string; data: unknown };

export interface AgentEventEnvelope {
  version: typeof AGENT_EVENT_PROTOCOL_VERSION;
  conversationId: string;
  agentId: string;
  runId: string;
  /** From bridge deliveryId; not guaranteed stable across approval resumes (v1 acceptable). */
  turnId: string;
  sequence: number;
  timestamp: string;
  event: AgentEvent;
}
