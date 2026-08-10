import type { AgentMessageRole, AgentToolResultContent, AgentToolSource } from '@novu/agent-event-protocol';

export type { AgentMessageRole };

export type AgentMessageStatus = 'sending' | 'sent' | 'failed';

export type AgentTextPartState = 'streaming' | 'done';

export type AgentToolPartState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

export type AgentApprovalPartState = 'pending' | 'approved' | 'denied';

export type AgentTextPart = {
  type: 'text';
  text: string;
  state: AgentTextPartState;
};

export type AgentThinkingPart = {
  type: 'thinking';
  thinkingId: string;
  text: string;
  state: AgentTextPartState;
};

export type AgentToolPart = {
  type: 'tool';
  toolUseId: string;
  toolName: string;
  source?: AgentToolSource;
  input?: Record<string, unknown>;
  output?: AgentToolResultContent[];
  state: AgentToolPartState;
};

export type AgentApprovalPart = {
  type: 'approval';
  approvalId: string;
  toolUseId: string;
  toolName: string;
  input?: Record<string, unknown>;
  source?: AgentToolSource;
  state: AgentApprovalPartState;
  /** Server-minted; echo via respondToApproval. Do not invent client-side. */
  approveActionId?: string;
  /** Server-minted; echo via respondToApproval. Do not invent client-side. */
  denyActionId?: string;
};

export type AgentSourcePart = {
  type: 'source';
  sourceType: 'url' | 'document';
  url?: string;
  title?: string;
  filename?: string;
};

export type AgentFilePart = {
  type: 'file';
  fileId: string;
  name?: string;
  mediaType?: string;
};

export type AgentCardPart = {
  type: 'card';
  card: Record<string, unknown>;
};

export type AgentMessagePart =
  | AgentTextPart
  | AgentThinkingPart
  | AgentToolPart
  | AgentApprovalPart
  | AgentSourcePart
  | AgentFilePart
  | AgentCardPart;

export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  parts: AgentMessagePart[];
  createdAt: string;
  status: AgentMessageStatus;
};

export type AgentConversationStatus = 'active' | 'resolved';

export type AgentConversationError = {
  message: string;
  code?: string;
};

/** Ephemeral typing indicator. Absent when not typing. */
export type AgentConversationTyping = {
  status?: string;
};

/** Timeline state produced by folding `AgentEventEnvelope`s. */
export type AgentConversationState = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  lastSequence: number;
  error?: AgentConversationError;
  /**
   * Fold-internal: assistant message that receives tool/thinking parts when events
   * omit `messageId`. Cleared on `run-finish` / `run-error`.
   */
  activeAssistantMessageId?: string;
};

export function createInitialAgentConversationState(): AgentConversationState {
  return {
    messages: [],
    isRunning: false,
    status: 'active',
    lastSequence: 0,
  };
}

export function derivePendingApprovals(messages: AgentMessage[]): AgentApprovalPart[] {
  const pending: AgentApprovalPart[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'approval' && part.state === 'pending') {
        pending.push(part);
      }
    }
  }

  return pending;
}
