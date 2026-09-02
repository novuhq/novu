import type { AgentMessageRole, AgentToolResultContent, AgentToolSource } from '@novu/agent-event-protocol';

export type { AgentMessageRole };

/** Delivery state of a local user send. */
export type AgentMessageStatus = 'sending' | 'sent' | 'failed';

/** Text is still arriving (`streaming`) or complete (`done`). */
export type AgentTextPartState = 'streaming' | 'done';

/** Lifecycle of a tool-call part. */
export type AgentToolPartState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

/** Lifecycle of a gated tool-approval part. */
export type AgentApprovalPartState = 'pending' | 'approved' | 'denied';

/** Lifecycle of an MCP connect card. */
export type AgentMcpConnectionPartState = 'pending' | 'connected' | 'failed';

/** Subscriber decision for a pending tool approval. */
export type AgentToolApprovalDecision = 'approved' | 'denied' | 'trust-tool' | 'trust-server';

/** Visible message text. */
export type AgentTextPart = {
  type: 'text';
  text: string;
  state: AgentTextPartState;
};

/** Agent reasoning text while the turn is in progress. */
export type AgentThinkingPart = {
  type: 'thinking';
  thinkingId: string;
  text: string;
  state: AgentTextPartState;
};

/** Tool call and its result. */
export type AgentToolPart = {
  type: 'tool';
  toolUseId: string;
  toolName: string;
  source?: AgentToolSource;
  input?: Record<string, unknown>;
  output?: AgentToolResultContent[];
  state: AgentToolPartState;
};

/** Gated tool that waits for the subscriber. */
export type AgentApprovalPart = {
  type: 'approval';
  approvalId: string;
  toolUseId: string;
  toolName: string;
  input?: Record<string, unknown>;
  source?: AgentToolSource;
  state: AgentApprovalPartState;
  /** Server-generated. Pass this id to `respondToAction`. Do not create it on the client. */
  approveActionId?: string;
  /** Server-generated. Pass this id to `respondToAction`. Do not create it on the client. */
  denyActionId?: string;
  /** Server-generated always-allow-this-tool action id. Present for managed tools that support trust. */
  trustToolActionId?: string;
  /** Server-generated always-allow-MCP-server action id. Present for MCP tools only. */
  trustServerActionId?: string;
};

/** MCP server connect card. Open `authorizeUrl` in the browser. */
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

/** Pending tool-approval item. Pass `id` to `respondToAction`. */
export type AgentToolApprovalAction = Omit<AgentApprovalPart, 'type' | 'state'> & {
  type: 'tool-approval';
  id: string;
};

/** Pending MCP connect item. Open `authorizeUrl`. */
export type AgentMcpConnectionAction = Omit<AgentMcpConnectionPart, 'state' | 'message'> & {
  id: string;
};

/** One item the UI must handle: a tool approval or an MCP connect card. */
export type AgentPendingAction = AgentToolApprovalAction | AgentMcpConnectionAction;

/** Citation. */
export type AgentSourcePart = {
  type: 'source';
  sourceType: 'url' | 'document';
  url?: string;
  title?: string;
  filename?: string;
};

/** File attachment metadata. */
export type AgentFilePart = {
  type: 'file';
  fileId: string;
  name?: string;
  mediaType?: string;
};

/** Structured Card. Button clicks call `sendAction`. */
export type AgentCardPart = {
  type: 'card';
  card: Record<string, unknown>;
  /** Id of the owning message. Pass this to `sendAction`. */
  sourceMessageId: string;
};

/** Custom payload. The UI decides how to render it. */
export type AgentDataPart = {
  type: 'data';
  name: string;
  data: unknown;
};

/** One content block in a message. */
export type AgentMessagePart =
  | AgentTextPart
  | AgentThinkingPart
  | AgentToolPart
  | AgentApprovalPart
  | AgentMcpConnectionPart
  | AgentSourcePart
  | AgentFilePart
  | AgentCardPart
  | AgentDataPart;

/** One message in the conversation timeline. */
export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  parts: AgentMessagePart[];
  createdAt: string;
  status: AgentMessageStatus;
  /** Client-generated idempotency key for outbound user messages (`msg_*`). */
  idempotencyKey?: string;
};

/** `'active'` or `'resolved'`. The agent sets `resolved` with `ctx.resolve()`. */
export type AgentConversationStatus = 'active' | 'resolved';

export type AgentConversationError = {
  message: string;
  code?: string;
};

/** Typing indicator. Absent when the agent is not typing. */
export type AgentConversationTyping = {
  status?: string;
};

/** Timeline produced by applying event envelopes. */
export type AgentConversationState = {
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  lastSequence: number;
  error?: AgentConversationError;
  /** Assistant message that receives tool and thinking parts when events omit `messageId`. */
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

export { derivePendingActions } from './derive-pending-actions';
