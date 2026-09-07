import type { WebChatPlanLimitError } from '../api';
import type { NovuError } from '../utils/errors';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMessage,
  AgentPendingAction,
} from './agent-message.types';
import type { WebChatChange, WebChatPagination } from './types';

/** History load state for this runtime: idle (`ready`), first page (`loading`), or older pages (`fetching`). */
export type AgentConversationSessionStatus = 'ready' | 'loading' | 'fetching';

/** Whether the agent turn is in progress, plus an optional typing indicator. */
export type AgentConversationRunSnapshot = {
  isRunning: boolean;
  typing?: AgentConversationTyping;
};

/** Extra context for one snapshot update. Omitted on the first `subscribe` call. */
export type AgentConversationPublicationMeta = {
  change?: WebChatChange;
  /** True after resume history finishes loading. */
  historyLoaded?: boolean;
};

/**
 * Immutable view of one conversation. `getSnapshot()` returns the same object
 * until the next update.
 */
export type AgentConversationSnapshot = {
  /** @internal Stable session key for this runtime. */
  key: string;
  /** Server conversation id after create or resume. */
  conversationId?: string;
  /** History load state. Not the conversation lifecycle. See {@link AgentConversationSnapshot.conversationStatus}. */
  status: AgentConversationSessionStatus;
  run: AgentConversationRunSnapshot;
  /** `'active'` or `'resolved'`. The agent sets `resolved` with `ctx.resolve()`. */
  conversationStatus: AgentConversationStatus;
  pagination: WebChatPagination;
  messages: readonly AgentMessage[];
  pendingActions: readonly AgentPendingAction[];
  error?: NovuError | WebChatPlanLimitError;
  /** True while reconnect recovery is in progress. */
  isRecovering: boolean;
  /** Set when reconnect recovery fails. Separate from send and fetch `error`. */
  catchUpError?: NovuError;
};

export type ConversationArgs = {
  /** Public agent identifier from the dashboard. */
  agentId: string;
  /** Resume this conversation. Omit to start a new chat. */
  conversationId?: string;
  /** HMAC-SHA256 of `agentId`. Required when Security HMAC is on for the Web Chat integration. */
  agentHash?: string;
};

/** Plain text, or text plus optional metadata for the agent. */
export type SendMessageInput = string | { text: string; metadata?: Record<string, unknown> };
