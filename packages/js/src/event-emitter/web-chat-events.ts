import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMessage,
  AgentPendingAction,
} from '../web-chat/agent-message.types';
import type { NovuError } from '../utils/errors';

export type WebChatPaginationStatus = 'idle' | 'loading' | 'error';

export type WebChatPagination = {
  status: WebChatPaginationStatus;
  hasMore: boolean;
};

/** What caused a fold. A live fold carries the envelope that caused it. Internal to the store seam. */
export type WebChatChangeSource =
  | { kind: 'live'; envelope: AgentEventEnvelope }
  | { kind: 'history' }
  | { kind: 'local' };

/**
 * What one fold added to a holder, next to the folded snapshot.
 * A `history` fold replays stored events, so it is catch-up and not new activity.
 */
export type WebChatChange = WebChatChangeSource & {
  /** Messages this fold added. A fold that only changes existing messages adds none. */
  addedMessages: AgentMessage[];
  /** Actions that became pending in this fold. One action is reported one time. */
  newActions: AgentPendingAction[];
};

export type WebChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  /** Immutable holder key. Stable for the life of the local conversation entry. */
  key: string;
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  hasMore: boolean;
  pagination: WebChatPagination;
  error?: NovuError;
  /** True while reconnect catch-up is in flight for this conversation. */
  isRecovering: boolean;
  /** Set when catch-up hits the safety page limit or HTTP ultimately fails. */
  catchUpError?: NovuError;
  change: WebChatChange;
};
