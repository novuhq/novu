import type { AgentMessageRole, AgentToolResultContent, AgentToolSource } from '@novu/agent-event-protocol';

export type { AgentMessageRole };

export type AgentMessageStatus = 'sending' | 'sent' | 'failed';

export type AgentTextPartState = 'streaming' | 'done';

export type AgentToolPartState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

export type AgentApprovalPartState = 'pending' | 'approved' | 'denied';
export type AgentMcpConnectionPartState = 'pending' | 'connected' | 'failed';

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
  /** Server-minted; echo via respondToAction. Do not invent client-side. */
  approveActionId?: string;
  /** Server-minted; echo via respondToAction. Do not invent client-side. */
  denyActionId?: string;
};

export type AgentMcpConnectionPart = {
  type: 'mcp-connection';
  actionId: string;
  mcpId: string;
  displayName: string;
  authorizeUrl: string;
  authorizeUrlWithAutoApprove?: string;
  state: AgentMcpConnectionPartState;
  message?: string;
};

export type AgentToolApprovalAction = Omit<AgentApprovalPart, 'type' | 'state'> & {
  type: 'tool-approval';
  id: string;
};

export type AgentMcpConnectionAction = Omit<AgentMcpConnectionPart, 'state' | 'message'> & {
  id: string;
};

export type AgentPendingAction = AgentToolApprovalAction | AgentMcpConnectionAction;

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
  | AgentMcpConnectionPart
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

export function derivePendingActions(messages: AgentMessage[]): AgentPendingAction[] {
  const pending: AgentPendingAction[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'approval' && part.state === 'pending') {
        const { state: _state, ...action } = part;
        pending.push({
          ...action,
          type: 'tool-approval',
          id: part.approvalId,
        });
      }
      if (part.type === 'mcp-connection' && part.state === 'pending') {
        const { state: _state, message: _message, ...action } = part;
        pending.push({
          ...action,
          id: part.actionId,
        });
      }
    }
  }

  return pending;
}
