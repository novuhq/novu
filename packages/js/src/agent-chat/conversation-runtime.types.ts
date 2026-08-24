import type { AgentChatPlanLimitError } from '../api';
import type { NovuError } from '../utils/errors';
import type {
  AgentConversationError,
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalDecision,
} from './agent-message.types';
import type {
  AgentChatChange,
  AgentChatPaginationStatus,
  FetchMoreResult,
  LoadConversationResult,
  RespondToActionResult,
  RetryMessageResult,
  SendActionResult,
  SendMessageResult,
} from './types';

/** Session lifecycle for history loads on this runtime. */
export type AgentConversationSessionStatus = 'ready' | 'loading' | 'fetching';

export type AgentConversationRunSnapshot = {
  isRunning: boolean;
  typing?: AgentConversationTyping;
};

export type AgentConversationPaginationSnapshot = {
  hasMore: boolean;
  status: AgentChatPaginationStatus;
};

/** Extra context for one snapshot publication. Omitted on the initial subscribe replay. */
export type AgentConversationPublicationMeta = {
  change?: AgentChatChange;
  /** Resume history finished loading for this runtime. */
  historyLoaded?: boolean;
};

/**
 * Immutable published view of one agent conversation thread.
 * `getSnapshot()` returns the same object reference until the next publication.
 */
export type AgentConversationSnapshot = {
  /** Holder key for this runtime session. Stable for the life of the runtime. */
  key: string;
  conversationId?: string;
  /** History load / pagination state for this runtime. */
  status: AgentConversationSessionStatus;
  run: AgentConversationRunSnapshot;
  conversationStatus: AgentConversationStatus;
  pagination: AgentConversationPaginationSnapshot;
  messages: readonly AgentMessage[];
  pendingActions: readonly AgentPendingAction[];
  error?: NovuError | AgentChatPlanLimitError | AgentConversationError;
  /** True while reconnect catch-up is in flight for this conversation. */
  isRecovering: boolean;
  /** Set when reconnect catch-up fails. Separate from send/fetch `error`. */
  catchUpError?: NovuError;
};

export type ConversationOk<T> = { ok: true; data: T };
export type ConversationErr = { ok: false; error: NovuError };
export type ConversationResult<T> = ConversationOk<T> | ConversationErr;

export type ConversationArgs = {
  agentId: string;
  conversationId?: string;
  agentHash?: string;
};

export type SendMessageInput = string | { text: string; metadata?: Record<string, unknown> };

export type AgentConversationRuntimeActions = {
  getSnapshot(): AgentConversationSnapshot;
  getServerSnapshot(): AgentConversationSnapshot;
  subscribe(
    listener: (snapshot: AgentConversationSnapshot, meta?: AgentConversationPublicationMeta) => void
  ): () => void;
  dispose(): void;
  load(): Promise<{ data?: LoadConversationResult; error?: NovuError }>;
  fetchMore(): Promise<{ data?: FetchMoreResult; error?: NovuError }>;
  sendMessage(
    input: SendMessageInput
  ): Promise<{ data?: SendMessageResult; error?: NovuError | AgentChatPlanLimitError }>;
  respondToAction(args: {
    actionId: string;
    decision: AgentToolApprovalDecision;
  }): Promise<{ data?: RespondToActionResult; error?: NovuError | AgentChatPlanLimitError }>;
  sendAction(args: {
    actionId: string;
    sourceMessageId: string;
    value?: string;
  }): Promise<{ data?: SendActionResult; error?: NovuError | AgentChatPlanLimitError }>;
  retryMessage(messageId: string): Promise<{ data?: RetryMessageResult; error?: NovuError | AgentChatPlanLimitError }>;
  cancelRun(): ConversationResult<void>;
};
